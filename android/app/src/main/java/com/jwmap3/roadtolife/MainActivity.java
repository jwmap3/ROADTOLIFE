package com.jwmap3.roadtolife;

import android.app.Activity;
import android.app.Presentation;
import android.content.Context;
import android.hardware.display.DisplayManager;
import android.media.MediaRouter;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * The phone runs the game (and is a player). When the phone is connected to a TV
 * (Smart View, Roku screen mirroring, Chromecast), Android gives the app a second
 * "presentation" screen. We put the TV view of the game there, so the TV shows the
 * board and room code while the phone keeps its own player screen.
 */
public class MainActivity extends Activity {
    private WebView web;
    private TvScreen tv;
    private volatile String lastState = "null";
    private MediaRouter router;
    private DisplayManager displays;

    private final MediaRouter.SimpleCallback routeCallback = new MediaRouter.SimpleCallback() {
        @Override public void onRouteSelected(MediaRouter r, int type, MediaRouter.RouteInfo info) { updateTv(); }
        @Override public void onRouteUnselected(MediaRouter r, int type, MediaRouter.RouteInfo info) { updateTv(); }
        @Override public void onRoutePresentationDisplayChanged(MediaRouter r, MediaRouter.RouteInfo info) { updateTv(); }
    };
    private final DisplayManager.DisplayListener displayListener = new DisplayManager.DisplayListener() {
        @Override public void onDisplayAdded(int id) { updateTv(); }
        @Override public void onDisplayRemoved(int id) { updateTv(); }
        @Override public void onDisplayChanged(int id) { }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        setUp(web);
        web.addJavascriptInterface(new Bridge(), "AndroidHub");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) { tellPhoneAboutTv(); }
        });
        web.loadUrl("file:///android_asset/www/app.html");
        setContentView(web);
        router = (MediaRouter) getSystemService(Context.MEDIA_ROUTER_SERVICE);
        displays = (DisplayManager) getSystemService(Context.DISPLAY_SERVICE);
        router.addCallback(MediaRouter.ROUTE_TYPE_LIVE_VIDEO, routeCallback);
        displays.registerDisplayListener(displayListener, null);
    }

    @Override protected void onResume() { super.onResume(); updateTv(); }

    @Override
    protected void onDestroy() {
        router.removeCallback(routeCallback);
        displays.unregisterDisplayListener(displayListener);
        if (tv != null) tv.dismiss();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    static void setUp(WebView w) {
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        w.setWebChromeClient(new WebChromeClient());
    }

    private Display findTvDisplay() {
        MediaRouter.RouteInfo route = router.getSelectedRoute(MediaRouter.ROUTE_TYPE_LIVE_VIDEO);
        Display d = route != null ? route.getPresentationDisplay() : null;
        if (d == null) {
            Display[] list = displays.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION);
            if (list.length > 0) d = list[0];
        }
        return d;
    }

    private void updateTv() {
        Display d = findTvDisplay();
        if (tv != null && (d == null || tv.getDisplay().getDisplayId() != d.getDisplayId())) {
            tv.dismiss();
            tv = null;
        }
        if (tv == null && d != null) {
            tv = new TvScreen(this, d);
            try { tv.show(); } catch (WindowManager.InvalidDisplayException e) { tv = null; }
        }
        tellPhoneAboutTv();
    }

    private void tellPhoneAboutTv() {
        if (web != null) web.evaluateJavascript("window.hubTv&&window.hubTv(" + (tv != null) + ")", null);
    }

    /** Called from the game page on the phone with the whole game state after every change. */
    private class Bridge {
        @JavascriptInterface
        public void state(String json) {
            lastState = json;
            runOnUiThread(() -> { if (tv != null) tv.push(json); });
        }

        /** Whiteboard strokes from the drawing cards, passed straight to the TV. */
        @JavascriptInterface
        public void ink(String json) {
            runOnUiThread(() -> { if (tv != null) tv.ink(json); });
        }
    }

    /** The second screen shown on the TV. */
    private class TvScreen extends Presentation {
        private WebView tvWeb;
        TvScreen(Context ctx, Display display) { super(ctx, display); }

        @Override
        protected void onCreate(Bundle state) {
            super.onCreate(state);
            tvWeb = new WebView(getContext());
            setUp(tvWeb);
            tvWeb.setWebViewClient(new WebViewClient() {
                @Override public void onPageFinished(WebView v, String url) {
                    push(lastState);
                    web.evaluateJavascript("window.hubInkAll&&window.hubInkAll()", null);
                }
            });
            tvWeb.loadUrl("file:///android_asset/www/tv.html");
            setContentView(tvWeb);
        }

        void ink(String json) {
            if (tvWeb != null) tvWeb.evaluateJavascript("window.hubInk&&window.hubInk(" + json + ")", null);
        }

        void push(String json) {
            if (tvWeb != null) tvWeb.evaluateJavascript("window.hubState&&window.hubState(" + json + ")", null);
        }
    }
}
