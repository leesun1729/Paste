import SwiftUI

struct RelativeTimeView: View {
    let date: Date

    var body: some View {
        Text(relativeString)
            .font(.system(size: 10))
            .foregroundColor(.secondary)
    }

    private var relativeString: String {
        let interval = -date.timeIntervalSinceNow
        if interval < 60 { return "just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        if interval < 604800 { return "\(Int(interval / 86400))d ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}
