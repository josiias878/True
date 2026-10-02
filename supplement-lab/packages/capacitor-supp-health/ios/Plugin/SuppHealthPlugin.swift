import Foundation
import Capacitor
import HealthKit

/**
 * Liest ausschließlich Schlafdauer und Herzratenvariabilität (HRV/SDNN) aus Apple Health.
 * Bewusst kein Training, keine Schritte, keine Workouts — nur die zwei Werte, die für die
 * Supplement-Auswertung relevant sind.
 *
 * Setup in Xcode (einmalig):
 *  1. Target > Signing & Capabilities > "+ Capability" > "HealthKit" hinzufügen.
 *  2. Info.plist: "Privacy - Health Share Usage Description"
 *     (NSHealthShareUsageDescription) setzen, z. B.
 *     "Supplement Lab liest deinen Schlaf und deine HRV, um zu zeigen, wie sich deine
 *     Supplements auf Erholung und Stress auswirken. Nichts verlässt dein Gerät."
 */
@objc(SuppHealthPlugin)
public class SuppHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SuppHealthPlugin"
    public let jsName = "SuppHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHrv", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()
    private var sleepType: HKCategoryType? { HKObjectType.categoryType(forIdentifier: .sleepAnalysis) }
    private var hrvType: HKQuantityType? { HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    // Überschreibt die Standard-Methode von CAPPlugin (ohne "override" kompiliert Swift nicht).
    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let sleep = sleepType, let hrv = hrvType else {
            call.resolve(["granted": false])
            return
        }
        store.requestAuthorization(toShare: [], read: [sleep, hrv]) { success, error in
            if let error = error {
                call.reject("Health-Berechtigung fehlgeschlagen: \(error.localizedDescription)")
                return
            }
            call.resolve(["granted": success])
        }
    }

    @objc func getSleep(_ call: CAPPluginCall) {
        guard let sleep = sleepType else { call.resolve(["days": []]); return }
        guard let range = parseRange(call) else { return }
        let (start, end) = range
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKSampleQuery(sampleType: sleep, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            guard let samples = samples as? [HKCategorySample], error == nil else {
                call.resolve(["days": []])
                return
            }
            // Nur "geschlafen" zählen, nicht "im Bett, aber wach"
            // asleepUnspecified/Core/Deep/REM gibt es erst ab iOS 16 (Mindestversion der App: iOS 15).
            // Rohwert 1 = "asleep" (bis iOS 15) bzw. "asleepUnspecified" (ab iOS 16).
            var asleepValues: Set<Int> = [1]
            if #available(iOS 16.0, *) {
                asleepValues.formUnion([
                    HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                    HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                    HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                    HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                ])
            }
            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd"
            df.timeZone = TimeZone.current
            // Dem Tag des Aufwachens zuordnen, damit "letzte Nacht" auf den heutigen Check-in-Tag fällt
            var byDay: [String: Double] = [:]
            for s in samples where asleepValues.contains(s.value) {
                let day = df.string(from: s.endDate)
                byDay[day, default: 0] += s.endDate.timeIntervalSince(s.startDate) / 3600.0
            }
            let days = byDay.map { (day, hours) -> [String: Any] in
                ["date": day, "hours": (hours * 100).rounded() / 100]
            }
            call.resolve(["days": days])
        }
        store.execute(query)
    }

    @objc func getHrv(_ call: CAPPluginCall) {
        guard let hrv = hrvType else { call.resolve(["days": []]); return }
        guard let range = parseRange(call) else { return }
        let (start, end) = range
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKSampleQuery(sampleType: hrv, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            guard let samples = samples as? [HKQuantitySample], error == nil else {
                call.resolve(["days": []])
                return
            }
            let unit = HKUnit.secondUnit(with: .milli)
            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd"
            df.timeZone = TimeZone.current
            var sums: [String: (sum: Double, n: Int)] = [:]
            for s in samples {
                let day = df.string(from: s.startDate)
                let v = s.quantity.doubleValue(for: unit)
                let prev = sums[day] ?? (0, 0)
                sums[day] = (prev.sum + v, prev.n + 1)
            }
            let days = sums.map { (day, agg) -> [String: Any] in
                ["date": day, "ms": ((agg.sum / Double(agg.n)) * 10).rounded() / 10]
            }
            call.resolve(["days": days])
        }
        store.execute(query)
    }

    private func parseRange(_ call: CAPPluginCall) -> (Date, Date)? {
        guard let startStr = call.getString("startDate"), let endStr = call.getString("endDate") else {
            call.reject("startDate/endDate fehlen")
            return nil
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var start = formatter.date(from: startStr)
        var end = formatter.date(from: endStr)
        if start == nil {
            formatter.formatOptions = [.withInternetDateTime]
            start = formatter.date(from: startStr)
        }
        if end == nil {
            formatter.formatOptions = [.withInternetDateTime]
            end = formatter.date(from: endStr)
        }
        guard let s = start, let e = end else {
            call.reject("startDate/endDate sind kein gültiges ISO-8601-Datum")
            return nil
        }
        return (s, e)
    }
}
