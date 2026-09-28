package de.gettrue.supphealth

import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Liest ausschließlich Schlafdauer und HRV (RMSSD) aus Google Health Connect.
 * Bewusst kein Training, keine Schritte, keine Workouts.
 *
 * Setup (einmalig, in der App unter android/app/src/main/):
 *  1. Die Permissions + den <queries>-Eintrag aus der README dieses Plugins in die
 *     App-eigene AndroidManifest.xml übernehmen.
 *  2. Health Connect muss auf dem Gerät vorhanden sein (ab Android 14 vorinstalliert,
 *     davor separat im Play Store) — sonst bleibt isAvailable() false.
 */
@CapacitorPlugin(name = "SuppHealth")
class SuppHealthPlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.Main)
    private val readPermissions = setOf(
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
    )
    private var permLauncher: ActivityResultLauncher<Set<String>>? = null
    private var pendingPermCall: PluginCall? = null

    private val client: HealthConnectClient? by lazy {
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE)
            HealthConnectClient.getOrCreate(context)
        else null
    }

    override fun load() {
        super.load()
        val contract = PermissionController.createRequestPermissionResultContract()
        val componentActivity = activity as? ComponentActivity ?: return
        permLauncher = componentActivity.activityResultRegistry.register(
            "supp_health_permissions", contract
        ) { granted ->
            val call = pendingPermCall
            pendingPermCall = null
            val ret = JSObject()
            ret.put("granted", granted.containsAll(readPermissions))
            call?.resolve(ret)
        }
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val ret = JSObject()
        ret.put("available", client != null)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        val hc = client
        val launcher = permLauncher
        if (hc == null || launcher == null) {
            val ret = JSObject()
            ret.put("granted", false)
            call.resolve(ret)
            return
        }
        scope.launch {
            val already = hc.permissionController.getGrantedPermissions()
            if (already.containsAll(readPermissions)) {
                val ret = JSObject()
                ret.put("granted", true)
                call.resolve(ret)
            } else {
                pendingPermCall = call
                launcher.launch(readPermissions)
            }
        }
    }

    @PluginMethod
    fun getSleep(call: PluginCall) {
        val hc = client
        if (hc == null) {
            call.resolve(emptyDays())
            return
        }
        val startStr = call.getString("startDate")
        val endStr = call.getString("endDate")
        if (startStr == null || endStr == null) {
            call.reject("startDate/endDate fehlen")
            return
        }
        scope.launch {
            try {
                val response = hc.readRecords(
                    ReadRecordsRequest(
                        SleepSessionRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(Instant.parse(startStr), Instant.parse(endStr))
                    )
                )
                val fmt = DateTimeFormatter.ISO_LOCAL_DATE
                val byDay = HashMap<String, Double>()
                for (r in response.records) {
                    // Dem Tag des Aufwachens zuordnen, damit "letzte Nacht" auf den heutigen Check-in-Tag fällt
                    val day = r.endTime.atZone(ZoneId.systemDefault()).toLocalDate().format(fmt)
                    val hours = (r.endTime.epochSecond - r.startTime.epochSecond) / 3600.0
                    byDay[day] = (byDay[day] ?: 0.0) + hours
                }
                val arr = JSArray()
                byDay.forEach { (day, hours) ->
                    val o = JSObject()
                    o.put("date", day)
                    o.put("hours", Math.round(hours * 100) / 100.0)
                    arr.put(o)
                }
                val ret = JSObject()
                ret.put("days", arr)
                call.resolve(ret)
            } catch (e: Exception) {
                call.resolve(emptyDays())
            }
        }
    }

    @PluginMethod
    fun getHrv(call: PluginCall) {
        val hc = client
        if (hc == null) {
            call.resolve(emptyDays())
            return
        }
        val startStr = call.getString("startDate")
        val endStr = call.getString("endDate")
        if (startStr == null || endStr == null) {
            call.reject("startDate/endDate fehlen")
            return
        }
        scope.launch {
            try {
                val response = hc.readRecords(
                    ReadRecordsRequest(
                        HeartRateVariabilityRmssdRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(Instant.parse(startStr), Instant.parse(endStr))
                    )
                )
                val fmt = DateTimeFormatter.ISO_LOCAL_DATE
                val sums = HashMap<String, DoubleArray>() // [Summe, Anzahl]
                for (r in response.records) {
                    val day = r.time.atZone(ZoneId.systemDefault()).toLocalDate().format(fmt)
                    val cur = sums.getOrPut(day) { doubleArrayOf(0.0, 0.0) }
                    cur[0] += r.heartRateVariabilityMillis
                    cur[1] += 1.0
                }
                val arr = JSArray()
                sums.forEach { (day, agg) ->
                    val o = JSObject()
                    o.put("date", day)
                    o.put("ms", Math.round((agg[0] / agg[1]) * 10) / 10.0)
                    arr.put(o)
                }
                val ret = JSObject()
                ret.put("days", arr)
                call.resolve(ret)
            } catch (e: Exception) {
                call.resolve(emptyDays())
            }
        }
    }

    private fun emptyDays(): JSObject {
        val ret = JSObject()
        ret.put("days", JSArray())
        return ret
    }
}
