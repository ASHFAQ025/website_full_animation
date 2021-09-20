const lightboxDefaultCss = `
        .animated-lightbox {
          transition: visibility 0.5s, opacity 0.5s;
          display: block !important;
          visibility: hidden;
          opacity: 0;
        }
    
        .show-lightbox {
          opacity: 1;
          visibility: visible;
        }
    `;

// Globals
if (typeof (youtubeVideos) === 'undefined') {
    window.youtubeVideos = [];
}
if (typeof (youtubePlayers) === 'undefined') {
    window.youtubePlayers = [];
}

const Common = {
    preventDoubleSubmission: function (form) {
        form.onsubmit = function (e) {
            if (form.dataset.submitted === '1') {
                e.preventDefault();
                e.stopImmediatePropagation();
            } else {
                form.dataset.submitted = '1';
            }
        };
    }
};

const LightboxRender = {
    cssManager: {
        addCssStyle: function (styles) {
            const lightboxStyles = document.createElement('style');
            lightboxStyles.appendChild(document.createTextNode(styles));

            const headDocument = document.getElementsByTagName('head')[0];
            const firstLink = document.getElementsByTagName('link')[0];
            headDocument.insertBefore(lightboxStyles, firstLink);
        },
    },

    animationManager: {
        enableAnimationCapabilities: function (lightboxElement) {
            lightboxElement.classList.add('animated-lightbox');
        },

        show: function (lightboxElement) {
            lightboxElement.classList.add('show-lightbox');
        },

        hide: function (lightboxElement) {
            const lightboxTooltips = document.querySelectorAll('.tooltip-lightbox')

            lightboxElement.classList.remove('show-lightbox');
            lightboxTooltips.forEach(tooltip => tooltip.parentNode.removeChild(tooltip));
        },
    },

    youtubeManager: {
        loadYoutubeApiScript: function () {
            const headTag = document.getElementsByTagName('head').item(0);
            const scriptTags = headTag.getElementsByTagName('script');
            const checkForYoutubeScript = () => {
                for (let scriptTag of scriptTags) {
                    if (/(youtube.(?:[a-z{2-3}]+)\/iframe_api)/.test(scriptTag.getAttribute('src'))) {
                        return true;
                    }
                }

                return false;
            };

            if (!checkForYoutubeScript()) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';

                const firstScriptTag = scriptTags[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }
        },

        handlePlayVideo: function (popup) {
            if (typeof window.youtubeVideos !== 'undefined') {
                window.youtubeVideos.forEach(function (video) {
                    const videoElement = document.getElementById(video.hash);
                    const popupElement = videoElement.closest('.landingi-popup');

                    if (popupElement && popupElement.id === popup.id) {
                        if (video.autoplay === 1 && typeof window.youtubePlayers[video.hash] !== 'undefined') {
                            window.youtubePlayers[video.hash].playVideo();
                        }
                    }
                });
            }
        },

        handlePauseVideo: function (popup) {
            if (typeof window.youtubeVideos !== 'undefined') {
                window.youtubeVideos.forEach(function (video) {
                    const videoElement = document.getElementById(video.hash);
                    const popupElement = videoElement.closest('.landingi-popup');

                    if (popupElement && popupElement.id === popup.id) {
                        if (window.youtubePlayers[video.hash] && typeof window.youtubePlayers[video.hash].pauseVideo === 'function') {
                            window.youtubePlayers[video.hash].pauseVideo();
                        }
                    }
                });
            }
        },

        initializeYoutubeVideos: function () {
            window.youtubeVideos.forEach(function (video) {
                const options = {
                    playerVars: {
                        rel: video.rel,
                        loop: video.loop,
                        showinfo: video.showinfo,
                        controls: video.controls,
                        mute: video.mute
                    },
                    events: {
                        'onReady': function (event) {
                            if (video.autoplay) {
                                if (document.getElementsByClassName('video-iframe-container').length || !document.getElementsByClassName('landingi-popup').length) {
                                    event.target.playVideo();
                                }
                            }
                        },
                        'onStateChange': function (event) {
                            if (event.target.getPlayerState() === 0 && video.loop !== 0) {
                                event.target.playVideo();
                            }
                        }
                    }
                };

                if (video.id) {
                    options.videoId = video.id;
                }

                if (undefined === window.youtubePlayers[video.hash]) {
                    window.youtubePlayers[video.hash] = new YT.Player(video.hash, options);
                }
            });
        },
    },

    vimeoManager: {
        initializeVimeoVideos: function () {
            const head = document.getElementsByTagName('head').item(0);
            const scripts = head.getElementsByTagName('script');
            const vimeoSrc = 'https://player.vimeo.com/api/player.js';
            let hasVimeo = false;

            for (let script of scripts) {
                if (script.getAttribute('src') === vimeoSrc) {
                    hasVimeo = true;
                }
            }

            if (false === hasVimeo) {
                const tag = document.createElement('script');
                const firstScriptTag = scripts[0];

                tag.src = vimeoSrc
                tag.addEventListener('load', function() {
                    window.dispatchEvent(new Event('lightbox-vimeo-ready'));
                });
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }
        },

        injectVimeo: function (lightboxContent) {
            let bodyId = lightboxContent.match(/id="([^"]*?)" class="landingi-popup-body"/)[1];
            let popupBody = document.querySelectorAll('#' + bodyId)[0];
            const popup = popupBody.closest('.landingi-popup');

            if (lightboxContent.search(/data-vimeo-url/) > 0) {
                LightboxRender.vimeoManager.initializeVimeoVideos();

                window.addEventListener('lightbox-vimeo-ready', function () {
                    LightboxRender.lightboxManager.hookCustomScripts(bodyId);
                    LightboxRender.vimeoManager.handlePauseVideos(popup);
                });
            } else {
                LightboxRender.lightboxManager.hookCustomScripts(bodyId);
            }
        },

        handlePauseVideos: function (popup) {
            for (let player of this.getVimeoPlayers(popup)) {
                player.pause();
            }
        },

        handlePlayVideos: function (popup) {
            for (let player of this.getVimeoPlayers(popup)) {
                if ('1' === player.autoplay) {
                    player.play();
                }
            }
        },

        handleMuteVideos: function (popup) {
            for (let player of this.getVimeoPlayers(popup)) {
                player.setVolume(0);
            }
        },

        handleUnmuteVideos: function (popup) {
            for (let player of this.getVimeoPlayers(popup)) {
                player.setVolume(1);
            }
        },

        getVimeoPlayers: function (popup) {
            const vimeoPlayers = [];

            for (let vimeoElement of popup.querySelectorAll('[data-vimeo-url]')) {
                let player = new Vimeo.Player(vimeoElement.getAttribute('id'), {});
                player.autoplay = vimeoElement.getAttribute('data-vimeo-autoplay') || '1';
                vimeoPlayers.push(player);
            }

            return vimeoPlayers;
        }
    },
    datepickerManager: {
        appendStyle: function () {
            const datepickerStyle = 'https://old.assets-landingi.com/js/libs/bootstrap-datepicker/dist/css/bootstrap-datepicker.standalone.min.css';
            const head = document.getElementsByTagName('head').item(0);
            const styleTags = head.getElementsByTagName('link');

            for (let style of styleTags) {
                if (style.getAttribute('href') === datepickerStyle) {
                    return;
                }
            }

            const datepickerStyleTag = document.createElement('link');
            const firstStyleTag = styleTags[0];

            datepickerStyleTag.href = 'https://old.assets-landingi.com/js/libs/bootstrap-datepicker/dist/css/bootstrap-datepicker.standalone.min.css';
            datepickerStyleTag.type = 'text/css';
            datepickerStyleTag.rel = 'stylesheet';
            head.insertBefore(datepickerStyleTag, firstStyleTag);
        },
        appendScript: function (language) {
            const datepickerScript = 'https://old.assets-landingi.com/js/libs/bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js';
            const datepickerLocaleScript = 'https://old.assets-landingi.com/js/libs/bootstrap-datepicker/dist/locales/bootstrap-datepicker.' + language + '.min.js';
            const body = document.getElementsByTagName('body').item(0);
            const scripts = body.getElementsByTagName('script');

            for (let script of scripts) {
                if (script.getAttribute('src') === datepickerScript) {
                    return;
                }
            }

            const datepickerScriptTag = document.createElement('script');
            const datepickerLocaleScriptTag = document.createElement('script');
            const lastScriptTag = scripts[scripts.length !== 0 ? scripts.length - 1 : scripts.length];

            datepickerScriptTag.type = 'text/javascript';
            datepickerLocaleScriptTag.type = 'text/javascript';
            datepickerScriptTag.src = datepickerScript;
            datepickerLocaleScriptTag.src = datepickerLocaleScript;
            body.insertBefore(datepickerScriptTag, lastScriptTag);
            body.insertBefore(datepickerLocaleScriptTag, lastScriptTag);
        },
        initializeDatepicker: function (language) {
            document.querySelectorAll('.landingi-popup input[subtype="date"]').forEach(function (datepicker) {
                const dateFormats = {
                    en: 'dd-mm-yyyy',
                    pl: 'dd.mm.yyyy',
                    ru: 'dd.mm.yyyy',
                    es: 'dd/mm/yyyy',
                    pt: 'dd/mm/yyyy',
                    fr: 'dd-mm-yyyy',
                    it: 'dd-mm-yyyy',
                };
                $(datepicker).datepicker({
                    autoclose: true,
                    clearBtn: true,
                    format: dateFormats[language],
                    language: language,
                    todayBtn: 'linked',
                    todayHighlight: true
                });
            });
        },
    },
    lightboxManager: {
        loadYoutube: function () {
            if (window.youtubeVideos.length <= 0 && window.youtubePlayers.length <= 0) {
                return;
            }

            if (typeof (YT) === 'undefined' || typeof (YT.Player) === 'undefined') {
                LightboxRender.youtubeManager.loadYoutubeApiScript();
            } else {
                window.onYouTubeIframeAPIReady();
            }
        },

        hookCustomScripts: function (bodyId) {
            let customScripts = document.querySelectorAll('#' + bodyId + ' script');
            for (let customScript of customScripts) {
                const parentElement = customScript.parentElement;
                const scriptSource = customScript.getAttribute('src');
                const scriptBody = customScript.innerHTML;

                if (scriptSource !== null) {
                    // This is a pretty hack, let me explain what is going on. Due to the asynchronous nature of light-boxes
                    // whole content is dynamically loaded, so every custom script must be hooked. So that there is no
                    // problem with CORS, we need to remove and add script again to let the browser load it properly.
                    parentElement.removeChild(customScript);

                    let hookedScript = document.createElement('script');
                    hookedScript.src = scriptSource;
                    parentElement.appendChild(hookedScript);
                }

                if (scriptBody !== '') {
                    parentElement.removeChild(customScript);

                    let hookedScript = document.createElement('script');
                    hookedScript.text = scriptBody;
                    parentElement.appendChild(hookedScript);
                }
            }
        },
        initializeCounter: function () {
            document.querySelectorAll('.landingi-popup .widget-counter').forEach(function ($counter) {
                var timer,
                    repeat = $counter.getAttribute('data-repeat'),
                    version = $counter.getAttribute('data-version'),
                    date = $counter.getAttribute('data-date'),
                    uid = $counter.getAttribute('id'),
                    end;

                if (repeat !== '-1') {
                    end = new Date(date);
                } else {
                    var cArray = document.cookie ? document.cookie.split(';') : [],
                        Cookies = {};

                    for (var c in cArray) {
                        if (cArray.hasOwnProperty(c) && typeof c === 'string') {
                            var temp = cArray[c].split('=');

                            Cookies[temp[0].replace(/\s/g, '')] = temp[1];
                        }
                    }

                    if (Cookies['count-' + uid]) {
                        end = new Date(Cookies['count-' + uid]);
                    } else {
                        end = new Date();

                        var exp = new Date();
                        exp.setMonth(exp.getMonth() + 1);

                        document.cookie = 'count-' + uid +
                            '=' + end +
                            ';expires=' + new Date(exp) +
                            ';path=' + window.location.pathname;
                    }

                    end.setMinutes(end.getMinutes() + parseInt(date, 10));
                }

                if (!version) {
                    end.setTime(end.getTime() + end.getTimezoneOffset() * 60 * 1000);
                }

                function showRemaining() {
                    var now = new Date(),
                        distance = end - now,
                        days, hours, minutes, seconds,
                        _second = 1000,
                        _minute = _second * 60,
                        _hour = _minute * 60,
                        _day = _hour * 24;

                    if (distance < 0) {
                        if (!version || parseInt(version, 10) < 2 || !repeat || repeat <= 0) {
                            clearInterval(timer);
                            days = 0;
                            hours = 0;
                            minutes = 0;
                            seconds = 0;
                        } else {
                            while (distance < 0) {
                                end.setDate(end.getDate() + parseInt(repeat, 10));
                                distance = end - now;
                            }
                        }
                    }

                    if (distance >= 0) {
                        days = Math.floor(distance / _day);
                        hours = Math.floor((distance % _day) / _hour);
                        minutes = Math.floor((distance % _hour) / _minute);
                        seconds = Math.floor((distance % _minute) / _second);
                    }

                    $counter.querySelectorAll('.widget-text[data-format]').forEach(function (element) {
                        var output = element.getAttribute('data-format');

                        output = output.replace('%dddd', ('000' + days).slice(-4));
                        output = output.replace('%ddd', ('00' + days).slice(-3));
                        output = output.replace('%dd', ('0' + days).slice(-2));
                        output = output.replace('%d', days);
                        output = output.replace('%hh', ('0' + hours).slice(-2));
                        output = output.replace('%mm', ('0' + minutes).slice(-2));
                        output = output.replace('%ss', ('0' + seconds).slice(-2));
                        output = output.replace('%h', hours);
                        output = output.replace('%m', minutes);
                        output = output.replace('%s', seconds);

                        element.innerText = output;
                    });

                    if ($counter.querySelector('.widget-text').length === 0) {
                        var format = $counter.getAttribute('data-format');

                        format = format.replace('%dddd', ('000' + days).slice(-4));
                        format = format.replace('%ddd', ('00' + days).slice(-3));
                        format = format.replace('%dd', ('0' + days).slice(-2));
                        format = format.replace('%d', days);
                        format = format.replace('%hh', ('0' + hours).slice(-2));
                        format = format.replace('%mm', ('0' + minutes).slice(-2));
                        format = format.replace('%ss', ('0' + seconds).slice(-2));
                        format = format.replace('%h', hours);
                        format = format.replace('%m', minutes);
                        format = format.replace('%s', seconds);

                        $counter.innerText(format);
                    }
                }

                timer = setInterval(showRemaining, 1000);
            });
        },

        registerEventHandlers: function () {
            const popups = document.querySelectorAll('[subtype="popup"]');

            popups.forEach(function (popupOpenButton) {
                const popupId = popupOpenButton.getAttribute('href').substring(1);
                let popup = document.getElementById(popupId);

                if (popup) {
                    LightboxRender.animationManager.enableAnimationCapabilities(popup);
                }

                popupOpenButton.addEventListener('click', function (e) {
                    e.preventDefault();

                    if (popup) {
                        LightboxRender.animationManager.show(popup);
                    }

                    let videoIframes = Array.prototype.slice.call(document.querySelectorAll('[class*="-iframe-enabled-"]:not(.iframe-mockup)'));
                    videoIframes = videoIframes.filter(function (item) {
                        return item.style.display !== 'none' && item.style.visibility !== 'hidden' && item.style.opacity > 0;
                    });

                    videoIframes.forEach(function (i, iframe) {
                        (new VideoBg(iframe)).resize();
                        if (window.innerWidth < 768) {
                            iframe.setAttribute('src', '');
                        }
                    });

                    LightboxRender.youtubeManager.handlePlayVideo(popup);
                    LightboxRender.vimeoManager.handlePlayVideos(popup);
                });
            });

            const popupsCloseButtons = document.querySelectorAll('.widget-popupcloser');

            popupsCloseButtons.forEach(function (popupCloseButton) {
                popupCloseButton.onclick = function (e) {
                    e.preventDefault();

                    const popup = this.closest('.landingi-popup');
                    LightboxRender.vimeoManager.handlePauseVideos(popup);
                    LightboxRender.youtubeManager.handlePauseVideo(popup);
                    LightboxRender.animationManager.hide(popup);
                };
            });

            const landingiPopups = document.getElementsByClassName('landingi-popup');

            for (let landingPopup of landingiPopups) { // close on click outside the lightbox
                landingPopup.onclick = function (e) {
                    if (e.target === landingPopup.getElementsByClassName('landingi-popup-body')[0]) {
                        LightboxRender.vimeoManager.handlePauseVideos(landingPopup);
                        LightboxRender.youtubeManager.handlePauseVideo(landingPopup);
                        LightboxRender.animationManager.hide(landingPopup);
                    }
                };
            }

            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    const landingiPopups = document.getElementsByClassName('landingi-popup');
                    for (let landingPopup of landingiPopups) {
                        LightboxRender.youtubeManager.handlePauseVideo(landingPopup);
                        LightboxRender.animationManager.hide(landingPopup);
                    }
                }
            });

            const forms = document.querySelectorAll('.landingi-popup .widget-form');

            for (let form of forms) {
                Common.preventDoubleSubmission(form);
            }
        },

        handleLightboxes: function () {
            LightboxRender.lightboxManager.registerEventHandlers();

            const widgetForms = document.querySelectorAll('.landingi-popup .widget-form');

            for (let widgetForm of widgetForms) {
                const formOnSubmit = function (e) {
                    e.preventDefault();

                    widgetForm = document.getElementById(widgetForm.id); // Refresh object

                    const getFormAction = function (action) {
                        if (action.indexOf('popuplead//') === 1) {
                            const popupLeadWithHash = action.replace('popuplead//', 'popuplead/' + landingiInternalDetails.landing_hash + '/');
                            let formattedAction = window.location.href + popupLeadWithHash;

                            if (window.location.href.indexOf('?') !== -1) {
                                formattedAction = window.location.href.replace(/(.*)\?(.*)/, `$1${popupLeadWithHash}?$2`);
                            }

                            return formattedAction;
                        }

                        return action;
                    };

                    const getValidationUrl = function () {
                        let validationUrl = 'https://api.landingi.com/validate';

                        if (window.location.href.indexOf('.landingi.it') > 0) {
                            validationUrl = 'https://api.landingi.it/validate';
                        }

                        return validationUrl;
                    };

                    const stylishForm = function (callback) {
                        const buttons = widgetForm.getElementsByClassName('widget-input-button');
                        for (let button of buttons) {
                            const overlays = button.getElementsByClassName('widget-overlay');
                            callback(button, overlays);
                        }
                    };

                    stylishForm(function (button, overlays) {
                        for (let overlay of overlays) {
                            overlay.style.color = window.getComputedStyle(button).color;
                            overlay.innerHTML += '<i class="fa fa-spinner fa-spin"></i>';
                        }

                        button.style.color = 'transparent';
                    });

                    const handleOnError = function (widgetForm) {
                        widgetForm.dataset.submitted = '0';

                        const tooltips = document.getElementsByClassName('form-error-tooltip');

                        for (let tooltip of tooltips) {
                            tooltip.parentNode.removeChild(tooltip);
                        }

                        stylishForm(function (button, overlays) {
                            for (let overlay of overlays) {
                                overlay.removeChild(overlay.firstChild);
                            }

                            button.style.color = '';
                        });
                    };

                    const formData = new FormData(widgetForm);
                    formData.set('_landing-hash', landingiInternalDetails.landing_hash);

                    const formXhr = new XMLHttpRequest();
                    formXhr.open('POST', getValidationUrl(), true);
                    formXhr.onreadystatechange = function () {
                        if (this.readyState === XMLHttpRequest.DONE) {
                            if (this.status === 200) {
                                if (window.submitGAformTracking) {
                                    window.submitGAformTracking();
                                    setTimeout(function () {
                                        widgetForm.setAttribute('action', getFormAction(widgetForm.getAttribute('action')));
                                        widgetForm.dataset.submitted = '0';
                                        document.removeEventListener('submit', formGlobalSubmit);
                                        widgetForm.submit();
                                    }, 300);
                                } else {
                                    widgetForm.setAttribute('action', getFormAction(widgetForm.getAttribute('action')));
                                    widgetForm.dataset.submitted = '0';
                                    document.removeEventListener('submit', formGlobalSubmit);
                                    widgetForm.submit();
                                }
                            } else if (this.status === 400) {
                                handleOnError(widgetForm);
                                const data = JSON.parse(formXhr.response);
                                let html = data.html;

                                validateCallbacks.forEach(function (callback) {
                                    let callbackHtml = callback(html);

                                    if (callbackHtml) {
                                        html = callbackHtml;
                                    }
                                });

                                const body = document.getElementsByTagName('body').item(0);
                                body.insertAdjacentHTML('beforeend', html);
                                window.positionValidationTooltips();
                                window.scrollToFirstTooltip();
                            } else {
                                console.error('LightboxRender: Unexpected response occurred');
                            }

                            LightboxRender.lightboxManager.registerEventHandlers();
                        }
                    };
                    formXhr.onerror = function () {
                        handleOnError(widgetForm);
                        LightboxRender.lightboxManager.registerEventHandlers();

                        console.error('LightboxRender: An error occured while sending form validation XHR');
                    };
                    formXhr.send(formData);
                };

                const formGlobalSubmit = function (e) {
                    // Must be an global event due to ajax is refreshing form binding
                    const formId = widgetForm.id;
                    if (e.target.id === formId) {
                        formOnSubmit(e);
                    }
                };

                document.addEventListener('submit', formGlobalSubmit);
            }
        },

        injectLightboxes: function (useAaf) {
            const lightboxXhr = new XMLHttpRequest();
            lightboxXhr.onload = function () {
                const lightboxes = JSON.parse(lightboxXhr.response);
                const landing = document.getElementsByTagName('body')[0];
                const head = document.getElementsByTagName('head')[0];

                if (!landing) {
                    return;
                }

                const links = [];
                const fonts = [];

                for (let link of document.getElementsByTagName('link')) {
                    links.push(link.href);
                }

                lightboxes.forEach(function (lightbox) {
                    landing.insertAdjacentHTML('beforeend', lightbox.content);
                    landing.insertAdjacentHTML('beforeend', '<link href="' + lightbox.style_url + '" rel="stylesheet" type="text/css">');

                    lightbox.fonts.forEach(function (font) {
                        if (!links.includes(font) && !fonts.includes(font)) {
                            fonts.push(font);
                            head.insertAdjacentHTML('beforeend', '<link href="' + font + '" rel="stylesheet" type="text/css">');
                        }
                    });

                    LightboxRender.vimeoManager.injectVimeo(lightbox.content);
                });

                const lightboxesReadyEvent = new Event('lightboxes-ready');
                head.dispatchEvent(lightboxesReadyEvent);

                if (lightboxes.length) {
                    LightboxRender.lightboxManager.initializeCounter();
                    LightboxRender.lightboxManager.handleLightboxes();
                    LightboxRender.datepickerManager.initializeDatepicker(landingiInternalDetails.landing_lang);
                    LightboxRender.lightboxManager.loadYoutube();
                }
            };

            lightboxXhr.open('GET', this.getRenderUrl(landingiInternalDetails.apikey, landingiInternalDetails.landing_id, useAaf));
            lightboxXhr.send();
        },

        getRenderUrl: function (apikey, landing_id, useAaf) {
            let renderUrl = 'https://lightboxes.landingi.com/api/v1/render?apikey=' + apikey + '&landing_id=' + landing_id;

            if (window.location.href.indexOf('.landingi.it') > 0) {
                renderUrl = 'https://lightboxes.landingi.it/api/v1/render?apikey=' + apikey + '&landing_id=' + landing_id;
            }

            if (useAaf) {
                renderUrl += '&aaf=' + window.location.pathname;
            }

            return renderUrl;
        }
    },

    init: function (options = {useAaf: false}) {
        LightboxRender.cssManager.addCssStyle(lightboxDefaultCss);

        window.onYouTubeIframeAPIReady = function () {
            LightboxRender.youtubeManager.initializeYoutubeVideos();
        };

        LightboxRender.datepickerManager.appendStyle();
        LightboxRender.datepickerManager.appendScript(landingiInternalDetails.landing_lang);
        LightboxRender.lightboxManager.injectLightboxes(options.useAaf);
    }
};
