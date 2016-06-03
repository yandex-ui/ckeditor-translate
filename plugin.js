(function() {
    'use strict';

    /**
     * Ссылка на помощь
     * @type {string}
     */
    CKEDITOR.config.translateInfo = '';

    /**
     * Начальное обозначение языка, с которого выполняется перевод
     * @type {string}
     */
    CKEDITOR.config.translateFrom = undefined;

    /**
     * Начальное обозначение языка, на который выполняется перевод
     * @type {string}
     */
    CKEDITOR.config.translateTo = undefined;

    /**
     * Автоматическое включение переводчика после инициализации редактора
     * @type {boolean}
     * @default false
     */
    CKEDITOR.config.translateAutoEnable = false;

    /**
     * Начальная инициализация переводчика.
     * Выполняется при каждом включении перевода.
     * @param {Editor} editor
     * @returns {vow.Promise}
     */
    CKEDITOR.config.translateInit = function(editor) {
        return new vow.Promise(function(resolve) {
            resolve();
        });
    };

    /**
     * Перевод текста
     * @param {Editor} editor
     * @param {string} data текст для перевода
     * @param {string} [langFrom] обозначение языка, с которого выполняется перевод
     * @param {string} [langTo] обозначение языка, на который выполняется перевод
     * @returns {vow.Promise}
     */
    CKEDITOR.config.translate = function(editor, data, langFrom, langTo) {
        return new vow.Promise(function(resolve) {
            resolve({ data: data, langFrom: langFrom, langTo: langTo });
        });
    };

    /**
     * Выбор языка перевода
     * @param {Editor} editor
     * @param {string} currentLang текущее обозначение языка
     * @param {CKEDITOR.dom.element} element
     * @param {string} direction направление языка перевода from|to
     * @returns {vow.Promise}
     */
    CKEDITOR.config.translateLangSelect = function(editor, currentLang, element, direction) {
        return new vow.Promise(function(resolve) {
            resolve({
                lang: currentLang,
                direction: direction
            });
        });
    };

    /**
     * Получение названия языка
     * @param {string} lang обозначение языка
     * @returns {string}
     */
    CKEDITOR.config.translateLangName = function(lang) {
        return String(lang || '');
    };

    /**
     * Название команды переключения интерфейса переводчика
     * @type {string}
     */
    var CMD_SHOW_TRANSLATOR = 'show_translator';

    /**
     * Название команды выполнения перевода
     * @type {string}
     */
    var CMD_TRANSLATE = 'translate';

    /**
     * Название команды применения перевода
     * @type {string}
     */
    var CMD_TRANSLATE_APPLY = 'translate_apply';

    /**
     * Название команды переключения перевода
     * @type {string}
     */
    var CMD_TRANSLATE_TOGGLE = 'translate_toggle';

    /**
     * Название класса для враппера содержимого редактора
     * @type {string}
     */
    var CLASS_TRANSLATE_WRAP = 'cke_contents_wrap_translate';

    /**
     * Название класса индикатора загрузки
     * @type {string}
     */
    var CLASS_TRANSLATE_LOAD = 'cke_translate_spinner';

    /**
     * Шаблон блока с результатом перевода
     */
    CKEDITOR.addTemplate(
        'translateWrapper',
        '<div id="{wrapId}" class="cke_translate_wrap">' +
            '<div id="{contentId}" class="cke_translate_content cke_editable"></div>' +
        '</div>'
    );

    /**
     * Шаблон кнопки информации о переводчике
     */
    CKEDITOR.addTemplate(
        'translateInfo',
        '<a class="cke_translate_header_info" href="{href}" target="_blank" rel="nofollow noopener">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="cke_button_icon cke_svgicon cke_svgicon--info">' +
                '<use xlink:href="#cke_svgicon--info"/>' +
                '<rect height="100%" width="100%" style="fill: transparent;"></rect>' +
            '</svg>' +
        '</a>'
    );

    /**
     * Шаблон блока "шапки" переводчика с выбором языков
     */
    CKEDITOR.addTemplate(
        'translateHeader',
        '<div id="{headerId}" class="cke_translate_header">' +
            '<div class="cke_translate_header_from">' +
                '<span title="{langFromTitle}" class="cke_translate_lang" onclick="CKEDITOR.tools.callFunction({clickLangFn}, \'from\', \'{langFrom}\', this); return false;">' +
                    '{langFromName}' +
                '</span>' +
            '</div>' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="cke_button_icon cke_svgicon cke_svgicon--arrow">' +
                '<use xlink:href="#cke_svgicon--arrow"/>' +
                '<rect height="100%" width="100%" style="fill: transparent;"></rect>' +
            '</svg>' +
            '<div class="cke_translate_header_to">' +
                '<span title="{langToTitle}" class="cke_translate_lang" onclick="CKEDITOR.tools.callFunction({clickLangFn}, \'to\', \'{langTo}\', this); return false;">' +
                    '{langToName}' +
                '</span>' +
            '</div>' +
            '{info}' +
        '</div>'
    );

    CKEDITOR.plugins.add('translate', {
        modes: { wysiwyg: 1, source: 1 },

        onLoad: function() {
            CKEDITOR.plugins.setLang('translate', 'ru', {
                translator: 'Переводчик',
                fromTitle: 'язык исходного текста',
                toTitle: 'язык перевода'
            });
        },

        init: function(editor) {
            editor.fnTranslateLangSelect = CKEDITOR.tools.addFunction(this.onTranslateLangSelect, editor);

            var cmdTranslate = editor.addCommand(CMD_TRANSLATE, {
                modes: { wysiwyg: 1, source: 1 },
                editorFocus: false,
                canUndo: false,
                readOnly: 1,
                async: true,
                startDisabled: true,
                exec: this.onExecTranslate
            });

            var cmdShowTranslator = editor.addCommand(CMD_SHOW_TRANSLATOR, {
                modes: { wysiwyg: 1, source: 1 },
                editorFocus: true,
                canUndo: false,
                readOnly: 1,
                exec: function() {
                    this.toggleState();
                }
            });

            editor.addCommand(CMD_TRANSLATE_APPLY, {
                modes: { wysiwyg: 1, source: 1 },
                editorFocus: false,
                canUndo: false,
                readOnly: 1,
                startDisabled: true,
                exec: this.onTranslateApply
            });

            editor.addCommand(CMD_TRANSLATE_TOGGLE, {
                modes: { wysiwyg: 1, source: 1 },
                editorFocus: false,
                canUndo: false,
                readOnly: 1,
                exec: this.onTranslateToggle
            });

            editor.ui.addButton('Translate', {
                label: editor.lang.translate.translator,
                title: editor.lang.translate.translator,
                icon: null,
                command: CMD_SHOW_TRANSLATOR
            });

            cmdTranslate.on('state', this.onStateTranslate, editor);
            cmdShowTranslator.on('state', this.onStateShowTranslator, editor);
            editor.on('instanceReady', this.onInstanceReady);
            editor.on('destroy', this.onDestroy);
            editor.on('mode', this.onMode);

            editor.translateEnabled = function() {
                return cmdShowTranslator.state === CKEDITOR.TRISTATE_ON;
            };

            editor.translateDebounce = debounce(function() {
                if (editor.translateEnabled()) {
                    var cmdTranslate = editor.getCommand(CMD_TRANSLATE);
                    cmdTranslate.enable();
                    cmdTranslate.exec();
                }
            }, 500);
        },

        /**
         * Автоматическое включение переводчика после инициализации редактора,
         * если установлена настройка translateAutoEnable
         * @this {Editor}
         */
        onInstanceReady: function() {
            if (this.config.translateAutoEnable) {
                this.execCommand(CMD_TRANSLATE_TOGGLE, true);
            }
        },

        /**
         * @this {Editor}
         */
        onMode: function() {
            this.editable().on('scroll', this.plugins.translate.syncScrollWrap, this);

            var wrap = this.ui.space('translate_wrap');
            if (wrap) {
                wrap.$.scrollTop = 0;
            }
        },

        /**
         * @this {Editor}
         */
        onDestroy: function() {
            this.translateDebounce.cancel();
            CKEDITOR.tools.removeFunction(this.fnTranslateLangSelect);

            this._.translateData = undefined;
            this._.translateError = false;
        },

        /**
         * Синхронизация скрола редактора с окном перевода
         * @param {Object} event
         * @this {Editor}
         */
        syncScrollWrap: function(event) {
            if (event.data.$.target.lockSyncScroll) {
                event.data.$.target.lockSyncScroll = false;
                return;
            }

            if (!this.translateEnabled()) {
                return;
            }

            var scroller = this.ui.space('translate_wrap');
            if (!scroller) {
                return;
            }

            scroller.$.lockSyncScroll = true;
            scroller.$.scrollTop = event.data.$.target.scrollTop;
        },

        /**
         * Синхронизация скрола окна перевода с редактором
         * @param {Object} event
         * @this {Editor}
         */
        syncScrollEditable: function(event) {
            if (event.data.$.target.lockSyncScroll) {
                event.data.$.target.lockSyncScroll = false;
                return;
            }

            var scroller = this.editable();
            if (!scroller) {
                return;
            }

            scroller.$.lockSyncScroll = true;
            scroller.$.scrollTop = event.data.$.target.scrollTop;
        },

        /**
         * Реакция на событие любого изменения содержимого редактора
         * @this {Editor}
         */
        onChangeContent: function() {
            if (this.translateEnabled()) {
                this.translateDebounce();
            }
        },

        /**
         * Выполнение запроса на выбор языка
         * @param {string} direction from|to обозначения языка с какого или на какой выполняется перевод
         * @param {string} currentLang обозначение текущего языка
         * @param {HTMLElement} target
         * @this {Editor}
         */
        onTranslateLangSelect: function(direction, currentLang, target) {
            var element = new CKEDITOR.dom.element(target);
            element.addClass('is-active');

            this.config.translateLangSelect(this, currentLang, element, direction)
                .then(onSuccessTranslateLangSelect, this)
                .always(function() {
                    element.removeClass('is-active');
                });
        },

        /**
         * Реакция на событие переключениия переводчика
         * @this {Editor}
         */
        onStateShowTranslator: function() {
            switch (this.getCommand(CMD_SHOW_TRANSLATOR).state) {
            case CKEDITOR.TRISTATE_ON:
                this.config.translateInit(this).then(onSuccessTranslateInit, this);
                break;

            case CKEDITOR.TRISTATE_OFF:
                translateDestroy(this);
                break;
            }
        },

        /**
         * Выполнение команды перевода
         * @param {Editor} editor
         * @param {string} data
         * @this {CKEDITOR.command}
         */
        onExecTranslate: function(editor, data) {
            if (this.state !== CKEDITOR.TRISTATE_OFF) {
                if (this.state === CKEDITOR.TRISTATE_ON) {
                    // запрос перевода до окончания текущего
                    // установка признака необходимости повторного запуска запроса на перевод
                    // после завершения текущего
                    this.notActual = true;
                }

                return;
            }

            if (!this.setState(CKEDITOR.TRISTATE_ON)) {
                return;
            }

            data = String(data || editor.getData() || '').trim();

            var eventData = {
                command: this,
                commandData: data,
                langFrom: editor.config.translateFrom,
                langTo: editor.config.translateTo,
                name: this.name,
                returnValue: undefined
            };

            if (!data) {
                editor._.translateData = '';
                editor._.translateError = false;
                eventData.returnValue = '';
                editor.fire('afterCommandExec', eventData);
                return;
            }

            editor.config.translate(editor, data, editor.config.translateFrom, editor.config.translateTo).then(function(result) {
                if (editor.translateEnabled()) {
                    eventData.returnValue = result.data;
                    eventData.langFrom = result.langFrom;
                    eventData.langTo = result.langTo;
                    editor._.translateData = result.data;
                    editor._.translateError = false;
                    editor.fire('afterCommandExec', eventData);
                }

            }).catch(function() {
                if (editor.translateEnabled()) {
                    editor._.translateData = undefined;
                    editor._.translateError = true;
                    editor.fire('afterCommandExec', eventData);
                }
            });
        },

        /**
         * Реакция на событие выполнения команды перевода
         * @param {Object} event
         * @this {Editor}
         */
        onAfterCommandExec: function(event) {
            var data = event.data;

            if (data.name !== CMD_TRANSLATE) {
                return;
            }

            var cmdTranslate = data.command;

            if (cmdTranslate.state === CKEDITOR.TRISTATE_DISABLED) {
                return;
            }

            // обновление перевода
            if (typeof data.returnValue !== 'undefined') {
                this.ui.space('translate_content').setHtml(data.returnValue);
            }

            // язык в результате перевода может отличаться от указанного в конфиге
            if (data.langFrom !== this.config.translateFrom ||
                data.langTo !== this.config.translateTo) {

                translateHeaderUpdate(this, data.langFrom, data.langTo);
            }

            // установка состояния окончания выполнения перевода
            cmdTranslate.setState(CKEDITOR.TRISTATE_OFF);

            // перезапуск, если в момент выполнения перевода пришел новый запрос на перевод
            if (cmdTranslate.notActual) {
                cmdTranslate.notActual = false;
                this.translateDebounce();
            }
        },

        /**
         * Изменение состояния выполнения команды перевода
         * CKEDITOR.TRISTATE_ON - вешаем спиннер
         * CKEDITOR.TRISTATE_OFF - снимаем спиннер
         * @this {Editor}
         */
        onStateTranslate: function() {
            var cmdTranslate = this.getCommand(CMD_TRANSLATE);
            var wrap = this.ui.space('contents_wrap');

            switch (cmdTranslate.state) {
            case CKEDITOR.TRISTATE_ON:
                wrap.addClass(CLASS_TRANSLATE_LOAD);
                break;
            default:
                wrap.removeClass(CLASS_TRANSLATE_LOAD);
            }
        },

        /**
         * Обработчик команды применения перевода
         * @param {Editor} editor
         * @this {CKEDITOR.command}
         */
        onTranslateApply: function(editor) {
            if (!editor.translateEnabled()) {
                return false;
            }

            var data = !editor._.translateError && editor._.translateData;

            editor.getCommand(CMD_SHOW_TRANSLATOR).setState(CKEDITOR.TRISTATE_OFF);

            if (typeof data === 'string') {
                editor.setData(data);
                return true;
            }

            return false;
        },

        /**
         * Обработчик команды переключения интерфейса перевода
         * @param {Editor} editor
         * @param {boolean} [toggle]
         * @this {CKEDITOR.command}
         */
        onTranslateToggle: function(editor, toggle) {
            var cmdShowTranslator = editor.getCommand(CMD_SHOW_TRANSLATOR);
            if (!cmdShowTranslator) {
                return;
            }

            var prevState = cmdShowTranslator.state;
            var nextState;

            if (typeof toggle === 'undefined') {
                nextState = prevState === CKEDITOR.TRISTATE_ON ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_ON;

            } else {
                nextState = toggle ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF;
            }

            cmdShowTranslator.setState(nextState);
        }
    });

    /**
     * Обновление "шапки" окна перевода с выводом языков
     * @param {Editor} editor
     * @param {string} [langFrom] обозначение языка, с которого выполняется перевод
     * @param {string} [langTo] обозначение языка, на который выполняется перевод
     */
    function translateHeaderUpdate(editor, langFrom, langTo) {
        langFrom = langFrom || editor.config.translateFrom || editor._translateFromActual;
        langTo = langTo || editor.config.translateTo || editor._translateToActual;

        var info = '';
        if (editor.config.translateInfo) {
            info = CKEDITOR.getTemplate('translateInfo').output({
                href: editor.config.translateInfo
            });
        }

        var htmlHeader = CKEDITOR.getTemplate('translateHeader').output({
            clickLangFn:    editor.fnTranslateLangSelect,
            headerId:       editor.ui.spaceId('translate_header'),
            info:           info,
            langFrom:       langFrom || '',
            langFromName:   editor.config.translateLangName(langFrom) || '...',
            langFromTitle:  editor.lang.translate.fromTitle,
            langTo:         langTo || '',
            langToName:     editor.config.translateLangName(langTo) || '...',
            langToTitle:    editor.lang.translate.toTitle
        });

        var elementHeader = editor.ui.space('translate_header');
        var elementNewHeader = CKEDITOR.dom.element.createFromHtml(htmlHeader);

        if (elementHeader) {
            elementNewHeader.replace(elementHeader);

        } else {
            editor.ui.space('top').append(elementNewHeader);
        }

        editor._translateFromActual = langFrom;
        editor._translateToActual = langTo;
    }

    /**
     * Реакция на событие успешного выбора языка
     * @param {Object} data
     * @param {string} data.lang обозначение выбранного языка
     * @param {string} data.direction from|to обозначения языка с какого или на какой выполняется перевод
     * @this {Editor}
     */
    function onSuccessTranslateLangSelect(data) {
        if (!this.translateEnabled()) {
            return;
        }

        var lang = data.lang;
        var direction = data.direction;

        if (direction === 'from') {
            this.config.translateFrom = lang;

            if (this._translateFromActual && this._translateToActual === lang) {
                this.config.translateTo = this._translateFromActual;
            }

        } else {
            this.config.translateTo = lang;

            if (this._translateToActual && this._translateFromActual === lang) {
                this.config.translateFrom = this._translateToActual;
            }
        }

        translateHeaderUpdate(this);
        this.translateDebounce();
    }

    /**
     * Реакция на событие успешной инициализации переводчика
     * @this {Editor}
     */
    function onSuccessTranslateInit() {
        if (!this.translateEnabled()) {
            return;
        }

        var cmdTranslate = this.getCommand(CMD_TRANSLATE);
        var cmdShowTranslator = this.getCommand(CMD_SHOW_TRANSLATOR);
        var cmdTranslateApply = this.getCommand(CMD_TRANSLATE_APPLY);
        var wrap = this.ui.space('contents_wrap');
        var plugin = this.plugins.translate;

        cmdTranslate.enable();
        cmdTranslateApply.enable();

        wrap.addClass(CLASS_TRANSLATE_WRAP);
        wrap.appendHtml(CKEDITOR.getTemplate('translateWrapper').output({
            wrapId: this.ui.spaceId('translate_wrap'),
            contentId: this.ui.spaceId('translate_content')
        }));

        translateHeaderUpdate(this);

        this.on('mode', plugin.onChangeContent);
        this.on('change', plugin.onChangeContent);
        this.on('afterCommandExec', plugin.onAfterCommandExec);

        var elementWrap = this.ui.space('translate_wrap');
        if (elementWrap) {
            elementWrap.on('scroll', plugin.syncScrollEditable, this);
        }

        if (cmdShowTranslator.previousState === CKEDITOR.TRISTATE_OFF) {
            this.fire('translate:enabled');
        }

        this.translateDebounce();
    }

    /**
     * Удаление переводчика
     * @param {Editor} editor
     */
    function translateDestroy(editor) {
        var cmdTranslate = editor.getCommand(CMD_TRANSLATE);
        var cmdShowTranslator = editor.getCommand(CMD_SHOW_TRANSLATOR);
        var cmdTranslateApply = editor.getCommand(CMD_TRANSLATE_APPLY);
        var wrap = editor.ui.space('contents_wrap');
        var plugin = editor.plugins.translate;

        editor._.translateData = undefined;
        editor._.translateError = false;

        editor.removeListener('mode', plugin.onChangeContent);
        editor.removeListener('change', plugin.onChangeContent);
        editor.removeListener('afterCommandExec', plugin.onAfterCommandExec);

        editor.translateDebounce.cancel();
        cmdTranslate.disable();
        cmdTranslateApply.disable();
        wrap.removeClass(CLASS_TRANSLATE_WRAP);

        var elementHeader = editor.ui.space('translate_header');
        if (elementHeader) {
            elementHeader.remove();
        }

        var elementWrap = editor.ui.space('translate_wrap');
        if (elementWrap) {
            elementWrap.remove();
        }

        if (cmdShowTranslator.previousState === CKEDITOR.TRISTATE_ON) {
            editor.fire('translate:disabled');
        }
    }

    var now = Date.now || function() {
        return new Date().getTime();
    };

    function debounce(func, wait, immediate) {
        var timeout, args, context, timestamp, result;

        var later = function() {
            var last = now() - timestamp;

            if (last < wait && last >= 0) {
                timeout = setTimeout(later, wait - last);

            } else {
                timeout = null;
                if (!immediate) {
                    result = func.apply(context, args);
                    if (!timeout) {
                        context = args = null;
                    }
                }
            }
        };

        var _debounce = function() {
            context = this;
            args = arguments;
            timestamp = now();

            var callNow = immediate && !timeout;
            if (!timeout) {
                timeout = setTimeout(later, wait);
            }

            if (callNow) {
                result = func.apply(context, args);
                context = args = null;
            }

            return result;
        };

        _debounce.cancel = function() {
            clearTimeout(timeout);
            context = args = timeout = null;
        };

        return _debounce;
    }
}());
