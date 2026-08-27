package com.yueshu.rehabmind;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Environment;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.util.Locale;

/**
 * RehabMind 的薄 WebView 外壳。业务状态仍由手机网页负责，原生层只负责
 * 安全的来源限制、返回栈、网络错误和页面状态恢复，避免 APK 与网页出现两套业务逻辑。
 */
public class MainActivity extends Activity {
    private static final String TAG = "RehabMindShell";
    private static final String STATE_WEBVIEW = "rehabmind.webview.state";
    private static final long LOAD_TIMEOUT_MS = 15_000L;

    private WebView webView;
    private String homeUrl;
    private String trustedScheme;
    private String trustedHost;
    private String trustedPathPrefix;
    private int trustedPort;
    private Runnable loadTimeout;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(46, 125, 110));

        homeUrl = BuildConfig.DEBUG ? BuildConfig.REHABMIND_DEBUG_URL : BuildConfig.REHABMIND_RELEASE_URL;
        Uri homeUri = Uri.parse(homeUrl);
        trustedScheme = normalizeScheme(homeUri.getScheme());
        trustedHost = homeUri.getHost();
        trustedPathPrefix = normalizePath(homeUri.getPath());
        trustedPort = normalizePort(homeUri.getPort(), trustedScheme);

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        logDebug("start version=" + BuildConfig.VERSION_NAME + " target=" + safeUrl(homeUrl));

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
        settings.setUserAgentString(settings.getUserAgentString() + " RehabMindApp/" + BuildConfig.VERSION_NAME);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTrustedUri(uri)) return false;
                logDebug("navigation blocked from app path=" + safeUrl(uri.toString()));
                openExternal(uri);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                logDebug("page started path=" + safeUrl(url));
                scheduleLoadTimeout();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                logDebug("page finished path=" + safeUrl(url));
                cancelLoadTimeout();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    logDebug("main frame error code=" + error.getErrorCode() + " path=" + safeUrl(request.getUrl().toString()));
                    showOfflinePage();
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // 生产包绝不忽略证书错误；否则 APK 会把中间人页面当作正式工作台。
                logDebug("ssl error primaryError=" + error.getPrimaryError());
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
                enqueueDownload(url, userAgent, contentDisposition, mimeType);
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
        String scheme = normalizeScheme(uri.getScheme());
        if (!trustedScheme.equals(scheme)) return false;
        if (normalizePort(uri.getPort(), scheme) != trustedPort) return false;
        String path = normalizePath(uri.getPath());
        return "/".equals(trustedPathPrefix) || path.equals(trustedPathPrefix) || path.startsWith(trustedPathPrefix + "/");
    }

    private String normalizeScheme(String scheme) {
        return scheme == null ? "" : scheme.toLowerCase(Locale.ROOT);
    }

    private int normalizePort(int port, String scheme) {
        if (port > 0) return port;
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private String normalizePath(String path) {
        if (path == null || path.isEmpty()) return "/";
        String normalized = path.startsWith("/") ? path : "/" + path;
        if ("/".equals(normalized)) return "/";
        return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
    }

    private void openExternal(Uri uri) {
        if (uri == null || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
            logDebug("unsupported external scheme");
            Toast.makeText(this, R.string.external_link_blocked, Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            logDebug("external link unavailable");
            Toast.makeText(this, "无法打开外部链接", Toast.LENGTH_SHORT).show();
        }
    }

    private void enqueueDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        try {
            Uri uri = Uri.parse(url);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            String fileName = sanitizeFileName(URLUtil.guessFileName(url, contentDisposition, mimeType));
            request.setTitle(fileName);
            request.setDescription(getString(R.string.download_description));
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if (mimeType != null && !mimeType.isEmpty()) request.setMimeType(mimeType);
            if (userAgent != null && !userAgent.isEmpty()) request.addRequestHeader("User-Agent", userAgent);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isEmpty()) request.addRequestHeader("Cookie", cookie);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException("DownloadManager unavailable");
            manager.enqueue(request);
            logDebug("download queued path=" + safeUrl(url));
            Toast.makeText(this, R.string.download_started, Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {
            logDebug("download rejected");
            Toast.makeText(this, R.string.download_failed, Toast.LENGTH_SHORT).show();
        }
    }

    private String sanitizeFileName(String fileName) {
        String safe = fileName == null || fileName.isEmpty() ? "rehabmind-download" : fileName;
        safe = safe.replaceAll("[\\\\/:*?\"<>|]", "_");
        return safe.isEmpty() ? "rehabmind-download" : safe;
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
        String safeUrl = TextUtils.htmlEncode(homeUrl);
        String html = "<html><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<body style='font-family:sans-serif;background:#f7f9fc;color:#334155;display:flex;"
            + "align-items:center;justify-content:center;text-align:center;height:90vh'>"
            + "<div><h2>页面暂时无法连接</h2><p>请检查网络或服务器地址后重试。</p>"
            + "<a href='" + safeUrl + "' style='display:inline-block;padding:12px 20px;"
            + "background:#2e7d6e;color:white;text-decoration:none;border-radius:6px'>重新加载</a>"
            + "</div></body></html>";
        logDebug("offline page shown");
        webView.loadDataWithBaseURL(homeUrl, html, "text/html", "UTF-8", null);
    }

    private String safeUrl(String rawUrl) {
        try {
            Uri uri = Uri.parse(rawUrl);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme();
            String host = uri.getHost() == null ? "" : uri.getHost();
            return scheme + "://" + host + normalizePath(uri.getPath());
        } catch (Exception ignored) {
            return "<invalid-url>";
        }
    }

    private void logDebug(String message) {
        if (BuildConfig.DEBUG) Log.d(TAG, message);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
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
        logDebug("destroy");
        if (webView != null) {
            webView.stopLoading();
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
        }
        super.onDestroy();
    }
}
