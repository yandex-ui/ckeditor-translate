(function() {
    'use strict';

    /**
     * Ссылка на помощь
     * @type {string}
     */
    CKEDITOR.config.translateInfo = '';

    /**
     * Начальное значение языка, с которого выполняется перевод
     * @type {array|string}
     * @default [ 'ru', 'русский' ]
     */
    CKEDITOR.config.translateFrom = [ 'ru', 'русский' ];

    /**
     * Начальное значение языка, на который выполняется перевод
     * @type {array|string}
     * @default [ 'en', 'английский' ]
     */
    CKEDITOR.config.translateTo = [ 'en', 'английский' ];

    /**
     * Автоматическое включение переводчика после инициализации редактора
     * @type {boolean}
     * @default false
     */
    CKEDITOR.config.translateAutoEnable = false;

    /**
     * Перевод текста
     * @param {string} data текст для перевода
     * @param {string} from обозначение языка, с которого выполняется перевод
     * @param {string} to обозначение языка, на который выполняется перевод
     * @returns {vow.Promise}
     */
    CKEDITOR.config.translate = function(data, from, to) {
        return new vow.Promise(function(resolve) {
            resolve(data);
        });
    };

    /**
     * Выбор языка перевода
     * @param {string} currentLang текущее обозначение языка
     * @returns {vow.Promise}
     */
    CKEDITOR.config.translateLangSelect = function(currentLang) {
        return new vow.Promise(function(resolve) {
            resolve(currentLang);
        });
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
            '<div id="{contentId}" class="cke_translate_content"></div>' +
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
                '<span class="cke_translate_lang" onclick="CKEDITOR.tools.callFunction({clickLangFn}, \'from\', \'{langFrom}\'); return false;">' +
                    '{langFromName}' +
                '</span>' +
            '</div>' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="cke_button_icon cke_svgicon cke_svgicon--arrow">' +
                '<use xlink:href="#cke_svgicon--arrow"/>' +
                '<rect height="100%" width="100%" style="fill: transparent;"></rect>' +
            '</svg>' +
            '<div class="cke_translate_header_to">' +
                '<span class="cke_translate_lang" onclick="CKEDITOR.tools.callFunction({clickLangFn}, \'to\', \'{langTo}\'); return false;">' +
                    '{langToName}' +
                '</span>' +
            '</div>' +
            '{info}' +
        '</div>'
    );

    CKEDITOR.plugins.add('translate', {
        modes: { wysiwyg: 1, source: 1 },
        requires: 'switchmode',

        onLoad: function() {
            CKEDITOR.plugins.setLang('translate', 'ru', {
                'translator': 'Переводчик'
            });
        },

        init: function(editor) {
            editor.translateDebounce = debounce(function() {
                var cmdShowTranslator = editor.getCommand(CMD_SHOW_TRANSLATOR);

                if (cmdShowTranslator.state === CKEDITOR.TRISTATE_ON) {
                    var cmdTranslate = editor.getCommand(CMD_TRANSLATE);
                    cmdTranslate.enable();
                    cmdTranslate.exec();
                }
            }, 100);

            editor.fnTranslateLangSelect = CKEDITOR.tools.addFunction(this.onTranslateLangSelect, editor);
            editor.fnTranslateLangFrom = CKEDITOR.tools.addFunction(this.onTranslateLangFrom, editor);
            editor.fnTranslateLangTo = CKEDITOR.tools.addFunction(this.onTranslateLangTo, editor);
            editor.fnTranslateHeaderUpdate = CKEDITOR.tools.addFunction(this.onTranslateHeaderUpdate, editor);

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

            editor.ui.addButton('Translate', {
                label: editor.lang.translate.translator,
                title: editor.lang.translate.translator,
                icon: null,
                command: CMD_SHOW_TRANSLATOR
            });

            cmdTranslate.on('state', this.onStateTranslate, editor);
            cmdShowTranslator.on('state', this.onStateShowTranslator, editor);
            editor.on('contentDom', this.onContentDom);
            editor.on('destroy', this.onDestroy);
            editor.on('mode', this.onMode);
        },

        /**
         * Автоматическое включение переводчика после инициализации редактора,
         * если установлена настройка translateAutoEnable
         * @this {Editor}
         */
        onContentDom: function() {
            if (this.config.translateAutoEnable) {
                this.getCommand(CMD_SHOW_TRANSLATOR).setState(CKEDITOR.TRISTATE_ON);
            }
        },

        /**
         * @this {Editor}
         */
        onMode: function() {
            this.editable().on('scroll', this.plugins.translate.syncScrollWrap, this);
        },

        /**
         * @this {Editor}
         */
        onDestroy: function() {
            this.translateDebounce.cancel();
            CKEDITOR.tools.removeFunction(this.fnTranslateLangSelect);
            CKEDITOR.tools.removeFunction(this.fnTranslateLangFrom);
            CKEDITOR.tools.removeFunction(this.fnTranslateLangTo);
            CKEDITOR.tools.removeFunction(this.fnTranslateHeaderUpdate);
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

            if (this.getCommand(CMD_SHOW_TRANSLATOR).state !== CKEDITOR.TRISTATE_ON) {
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
            if (this.getCommand(CMD_SHOW_TRANSLATOR).state === CKEDITOR.TRISTATE_ON) {
                this.translateDebounce();
            }
        },

        /**
         * Получение названия или обозначения языка, с которого выполняется перевод
         * @param {boolean} [needName=false] true, если необходимо получить название
         * @returns {string}
         * @this {Editor}
         */
        onTranslateLangFrom: function(needName) {
            var lang = Array.isArray(this.config.translateFrom) ?
                this.config.translateFrom[ needName ? 1 : 0 ] :
                this.config.translateFrom;

            return lang || 'ru';
        },

        /**
         * Получение названия или обозначения языка, на который выполняется перевод
         * @param {boolean} [needName=false] true, если необходимо получить название
         * @returns {string}
         * @this {Editor}
         */
        onTranslateLangTo: function(needName) {
            var lang = Array.isArray(this.config.translateTo) ?
                this.config.translateTo[ needName ? 1 : 0 ] :
                this.config.translateTo;

            return lang || 'en';
        },

        /**
         * Выполнение запроса на выбор языка
         * @param {string} direction from|to обозначения языка с какого или на какой выполняется перевод
         * @param {string} currentLang обозначение текущего языка
         * @this {Editor}
         */
        onTranslateLangSelect: function(direction, currentLang) {
            this.config.translateLangSelect(currentLang).then(function(lang) {
                if (direction === 'from') {
                    this.config.translateFrom = lang;
                } else {
                    this.config.translateTo = lang;
                }

                CKEDITOR.tools.callFunction(this.fnTranslateHeaderUpdate);
            }, this);
        },

        /**
         * Обновление "шапки" окна перевода с выводом языков
         * @this {Editor}
         */
        onTranslateHeaderUpdate: function() {
            var htmlHeader = CKEDITOR.getTemplate('translateHeader').output({
                headerId: this.ui.spaceId('translate_header'),
                clickLangFn: this.fnTranslateLangSelect,
                langFrom: CKEDITOR.tools.callFunction(this.fnTranslateLangFrom),
                langFromName: CKEDITOR.tools.callFunction(this.fnTranslateLangFrom, true),
                langTo: CKEDITOR.tools.callFunction(this.fnTranslateLangTo),
                langToName: CKEDITOR.tools.callFunction(this.fnTranslateLangTo, true),
                info: this.config.translateInfo && CKEDITOR.getTemplate('translateInfo').output({ href: this.config.translateInfo }) || ''
            });

            var elementHeader = this.ui.space('translate_header');
            var elementNewHeader = CKEDITOR.dom.element.createFromHtml(htmlHeader);

            if (elementHeader) {
                elementNewHeader.replace(elementHeader);

            } else {
                this.ui.space('top').append(elementNewHeader);
            }
        },

        /**
         * Реакция на событие переключениия переводчика
         * @this {Editor}
         */
        onStateShowTranslator: function() {
            var cmdTranslate = this.getCommand(CMD_TRANSLATE);
            var cmdShowTranslator = this.getCommand(CMD_SHOW_TRANSLATOR);
            var wrap = this.ui.space('contents_wrap');
            var plugin = this.plugins.translate;
            var elementWrap;

            switch (cmdShowTranslator.state) {
            case CKEDITOR.TRISTATE_ON:
                cmdTranslate.enable();
                wrap.addClass(CLASS_TRANSLATE_WRAP);

                CKEDITOR.tools.callFunction(this.fnTranslateHeaderUpdate);

                wrap.appendHtml(CKEDITOR.getTemplate('translateWrapper').output({
                    wrapId: this.ui.spaceId('translate_wrap'),
                    contentId: this.ui.spaceId('translate_content')
                }));

                this.translateDebounce();

                this.on('mode', plugin.onChangeContent);
                this.on('change', plugin.onChangeContent);
                this.on('afterCommandExec', plugin.onAfterCommandExec);

                elementWrap = this.ui.space('translate_wrap');
                if (elementWrap) {
                    elementWrap.on('scroll', plugin.syncScrollEditable, this);
                }
                break;

            case CKEDITOR.TRISTATE_OFF:
                this.removeListener('mode', plugin.onChangeContent);
                this.removeListener('change', plugin.onChangeContent);
                this.removeListener('afterCommandExec', plugin.onAfterCommandExec);

                this.translateDebounce.cancel();
                cmdTranslate.disable();
                wrap.removeClass(CLASS_TRANSLATE_WRAP);

                var elementHeader = this.ui.space('translate_header');
                elementHeader && elementHeader.remove();

                elementWrap = this.ui.space('translate_wrap');
                if (elementWrap) {
                    elementWrap.remove();
                }
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
                name: this.name,
                commandData: data,
                command: this,
                returnValue: ''
            };

            if (!data) {
                editor.fire('afterCommandExec', eventData);
                return;
            }

            var langFrom = CKEDITOR.tools.callFunction(editor.fnTranslateLangFrom);
            var langTo = CKEDITOR.tools.callFunction(editor.fnTranslateLangTo);

            editor.config.translate(data, langFrom, langTo).then(function(result) {
                eventData.returnValue = result;
                editor.fire('afterCommandExec', eventData);
            });
        },

        /**
         * Реакция на событие выполнения команды перевода
         * @param {Object} event
         * @this {Editor}
         */
        onAfterCommandExec: function(event) {
            if (event.data.name !== CMD_TRANSLATE) {
                return;
            }

            var cmdTranslate = event.data.command;

            if (cmdTranslate.state === CKEDITOR.TRISTATE_DISABLED) {
                return;
            }

            // обновление перевода
            this.ui.space('translate_content').setHtml(event.data.returnValue);
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
        }
    });

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
            context = args = null;
        };

        return _debounce;
    }
}());
