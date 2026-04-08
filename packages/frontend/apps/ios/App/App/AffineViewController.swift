import Capacitor
import Intelligents
import UIKit

class AFFiNEViewController: CAPBridgeViewController {
  // The floating IntelligentsButton (the round AI button shown in
  // the bottom-right corner) is intentionally disabled in this fork.
  // We keep the property declaration so the
  // `AffineViewController+AIButton.swift` extension still type-checks
  // (it conforms us to `IntelligentsButtonDelegate`), but we never
  // install the button into the view hierarchy and never start the
  // 3-second eligibility timer that previously presented it. The JS
  // side's `AIButtonService.presentAIButton(false)` is also wired up
  // for belt-and-braces, but the real source of the button was here.
  var intelligentsButton: IntelligentsButton?

  override func viewDidLoad() {
    super.viewDidLoad()
    webView?.allowsBackForwardNavigationGestures = true
    navigationController?.navigationBar.isHidden = true
    extendedLayoutIncludesOpaqueBars = false
    edgesForExtendedLayout = []
  }

  override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
    let configuration = super.webViewConfiguration(for: instanceConfiguration)
    return configuration
  }

  override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
    super.webView(with: frame, configuration: configuration)
  }

  override func capacitorDidLoad() {
    let plugins: [CAPPlugin] = [
      AuthPlugin(),
      CookiePlugin(),
      HashcashPlugin(),
      NavigationGesturePlugin(),
      NbStorePlugin(),
      PayWallPlugin(associatedController: self),
      PreviewPlugin(),
    ]
    plugins.forEach { bridge?.registerPluginInstance($0) }
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    IntelligentContext.shared.webView = webView
    navigationController?.setNavigationBarHidden(false, animated: animated)
  }
}
