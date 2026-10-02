// swift-tools-version: 5.9
// Swift Package Manager (Capacitor 8 nutzt für iOS SPM statt CocoaPods).
// Die .podspec bleibt für CocoaPods-Projekte erhalten.
import PackageDescription

let package = Package(
    name: "CapacitorSuppHealth",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorSuppHealth",
            targets: ["SuppHealthPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "SuppHealthPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Plugin",
            linkerSettings: [.linkedFramework("HealthKit")])
    ]
)
