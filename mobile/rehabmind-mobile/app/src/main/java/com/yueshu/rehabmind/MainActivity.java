package com.yueshu.rehabmind;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * RehabMind 的薄 WebView 外壳。业务状态仍由手机网页负责，原生层只负责
 * 安全的来源限制、返回栈、网络错误和页面状态恢复，避免 APK 与网页出现两套业务逻辑。
 */
public class MainActivity extends Activity {
    private static final String STATE_WEBVIEW = "rehabmind.webview.state";
    private static final long LOAD_TIMEOUT_MS = 15_000L;

    private WebView webView;
    private String homeUrl;
    private String trustedHost;
    private String trustedPathPrefix;
    private Runnable loadTimeout;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(46, 125, 110));

        homeUrl = BuildConfig.DEBUG ? BuildConfig.REHABMIND_DEBUG_URL : BuildConfig.REHABMIND_RELEASE_URL;
        Uri homeUri = Uri.parse(homeUrl);
        trustedHost = homeUri.getHost();
        trustedPathPrefix = normalizePath(homeUri.getPath());

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(247, 249, 252));
        setContentView(webView);
        configureWebView();

        if (savedInstanceState != null && savedInstanceState.containsKey(STATE_WEBVIEW)) {
            webView.restoreState(savedInstanceState);
        } else {
            loadHome();
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " RehabMindMobile/" + BuildConfig.VERSION_NAME);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTrustedUri(uri)) return false;
                openExternal(uri);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                scheduleLoadTimeout();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                cancelLoadTimeout();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOfflinePage();
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // 生产包绝不忽略证书错误；否则 APK 会把中间人页面当作正式工作台。
                handler.cancel();
                showOfflinePage();
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                Uri uri = Uri.parse(url);
                if (!isTrustedUri(uri)) {
                    openExternal(uri);
                    return;
                }
                Toast.makeText(MainActivity.this, R.string.download_started, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadHome() {
        if (!isTrustedUri(Uri.parse(homeUrl))) {
            showOfflinePage();
            return;
        }
        webView.loadUrl(homeUrl);
    }

    private boolean isTrustedUri(Uri uri) {
        if (uri == null || trustedHost == null || !trustedHost.equalsIgnoreCase(uri.getHost())) return false;
        String scheme = uri.getScheme();
        if (BuildConfig.DEBUG) {
            if (!("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) return false;
        } else if (!"https".equalsIgnoreCase(scheme)) {
            return false;
        }
        String path = normalizePath(uri.getPath());
        return "/".equals(trustedPathPrefix) || path.equals(trustedPathPrefix) || path.startsWith(trustedPathPrefix + "/");
    }

    private String normalizePath(String path) {
        if (path == null || path.isEmpty()) return "/";
        String normalized = path.startsWith("/") ? path : "/" + path;
        if ("/".equals(normalized)) return "/";
        return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            Toast.makeText(this, "无法打开外部链接", Toast.LENGTH_SHORT).show();
        }
    }

    private void scheduleLoadTimeout() {
        cancelLoadTimeout();
        loadTimeout = () -> {
            if (webView != null && webView.getProgress() < 100) showOfflinePage();
        };
        webView.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);
    }

    private void cancelLoadTimeout() {
        if (loadTimeout != null && webView != null) webView.removeCallbacks(loadTimeout);
        loadTimeout = null;
    }

    private void showOfflinePage() {
        cancelLoadTimeout();
        String safeUrl = homeUrl.replace("'", "%27");
        String html = "<html><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<body style='font-family:sans-serif;background:#f7f9fc;color:#334155;display:flex;"
            + "align-items:center;justify-content:center;text-align:center;height:90vh'>"
            + "<div><h2>页面暂时无法连接</h2><p>请检查网络或服务器地址后重试。</p>"
            + "<button onclick=\"location.href='" + safeUrl + "'\" style='padding:10px 20px'>重新加载</button>"
            + "</div></body></html>";
        webView.loadDataWithBaseURL(homeUrl, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        outState.putBoolean(STATE_WEBVIEW, true);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        cancelLoadTimeout();
        if (webView != null) {
            webView.stopLoading();
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
        }
        super.onDestroy();
    }
}
