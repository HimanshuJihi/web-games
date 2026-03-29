// Global Ad Manager
const rewardedAdManager = {
    adContainer: null,
    adDisplayContainer: null,
    adsLoader: null,
    adsManager: null,
    onSuccessCallback: null,
    onFailureCallback: null,
    isInitialized: false,
    adTagUrl: 'https://baggymaintenance.com/drmiF.zodYGSNlvNZaGuUr/keXmM9FuMZdU/l/kdPDTjY/5qM/DxY/0/MMDxEitjNkjYk_waN-jOQfwiNBSaZHsLaVWb1epAdfDp0wxO',

    init: function(adContainerId) {
        if (this.isInitialized) return;

        this.adContainer = document.getElementById(adContainerId);
        if (!this.adContainer) {
            console.error('Ad container not found:', adContainerId);
            return;
        }

        google.ima.settings.setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.INSECURE);

        this.adDisplayContainer = new google.ima.AdDisplayContainer(this.adContainer);
        this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);

        this.adsLoader.addEventListener(
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            this.onAdsManagerLoaded.bind(this),
            false
        );
        this.adsLoader.addEventListener(
            google.ima.AdErrorEvent.Type.AD_ERROR,
            this.onAdError.bind(this),
            false
        );
        
        this.isInitialized = true;
    },

    requestAd: function(onSuccess, onFailure) {
        if (!this.isInitialized) {
            console.error("Ad Manager not initialized.");
            if (onFailure) onFailure();
            return;
        }
        
        this.onSuccessCallback = onSuccess;
        this.onFailureCallback = onFailure;

        const adsRequest = new google.ima.AdsRequest();
        adsRequest.adTagUrl = this.adTagUrl;
        adsRequest.linearAdSlotWidth = this.adContainer.clientWidth;
        adsRequest.linearAdSlotHeight = this.adContainer.clientHeight;
        adsRequest.nonLinearAdSlotWidth = this.adContainer.clientWidth;
        adsRequest.nonLinearAdSlotHeight = this.adContainer.clientHeight / 3;

        this.adsLoader.requestAds(adsRequest);
    },

    onAdsManagerLoaded: function(adsManagerLoadedEvent) {
        this.adsManager = adsManagerLoadedEvent.getAdsManager(this.adContainer);

        this.adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, this.onAdError.bind(this));
        this.adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, this.onAdEvent.bind(this));
        this.adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, this.onAdEvent.bind(this));
        this.adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, this.onAdEvent.bind(this));
        this.adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE, this.onAdEvent.bind(this));

        try {
            this.adContainer.style.display = 'flex';
            this.adsManager.init(this.adContainer.clientWidth, this.adContainer.clientHeight, google.ima.ViewMode.NORMAL);
            this.adsManager.start();
        } catch (adError) {
            console.error("AdsManager could not be started", adError);
            if (this.onFailureCallback) this.onFailureCallback();
        }
    },

    onAdEvent: function(adEvent) {
        switch (adEvent.type) {
            case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
            case google.ima.AdEvent.Type.COMPLETE:
                if (this.onSuccessCallback) this.onSuccessCallback();
                this.cleanup();
                break;
            case google.ima.AdEvent.Type.SKIPPED:
            case google.ima.AdEvent.Type.USER_CLOSE:
                if (this.onFailureCallback) this.onFailureCallback();
                this.cleanup();
                break;
        }
    },

    onAdError: function(adErrorEvent) {
        console.error('Ad Error:', adErrorEvent.getError());
        if (this.adsManager) this.adsManager.destroy();
        if (this.onFailureCallback) this.onFailureCallback();
        this.cleanup();
    },
    
    cleanup: function() {
        this.adContainer.style.display = 'none';
        this.onSuccessCallback = null;
        this.onFailureCallback = null;
    }
};