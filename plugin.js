(function() {
    'use strict';

    /**
     * Ссылка на помощь
     * @type {string}
     */
    CKEDITOR.config.translateInfo = '';

    CKEDITOR.config.translateFrom = [ 'ru', 'русский' ];

    CKEDITOR.config.translateTo = [ 'en', 'английский' ];

    CKEDITOR.config.translate = function(data, from, to) {
        return new vow.Promise(function(resolve) {
            resolve(data);
        });
    };

    CKEDITOR.config.translateLangSelect = function(currentLang) {
        return new vow.Promise(function(resolve) {
            resolve(currentLang);
        });
    };

    var CMD_SHOW_TRANSLATOR = 'show_translator';
    var CMD_TRANSLATE = 'translate';
    var CLASS_TRANSLATE_WRAP = 'cke_contents_wrap_translate';
    var CLASS_TRANSLATE_LOAD = 'cke_translate_load';

    CKEDITOR.addTemplate(
        'translateWrapper',
        '<div id="{wrapId}" class="cke_translate_wrap">' +
            '<div id="{contentId}" class="cke_translate_content"></div>' +
        '</div>'
    );

    CKEDITOR.addTemplate(
        'translateInfo',
        '<a class="cke_translate_header_info" href="{href}" target="_blank" rel="nofollow noopener">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="cke_button_icon cke_svgicon cke_svgicon--info">' +
                '<use xlink:href="#cke_svgicon--info"/>' +
                '<rect height="100%" width="100%" style="fill: transparent;"></rect>' +
            '</svg>' +
        '</a>'
    );

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

        onLoad: function() {
            CKEDITOR.plugins.setLang('translate', 'ru', {
                'translator': 'Переводчик'
            });
        },

        init: function(editor) {
            var lang = editor.lang.translate;

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
                label: lang.translator,
                title: lang.translator,
                icon: null,
                command: CMD_SHOW_TRANSLATOR
            });

            cmdTranslate.on('state', this.onStateTranslate, editor);
            cmdShowTranslator.on('state', this.onStateShowTranslator, editor);
            editor.on('afterCommandExec', this.onAfterCommandExec);
            editor.on('destroy', this.onDestroy);

            // editor.on('loaded', this.onLoaded);
            // editor.on('mode', this.onMode);
            // editor.on('beforeSetMode', this.onBeforeSetMode);
        },

        /**
         * @this {Editor}
         */
        onDestroy: function() {
            CKEDITOR.tools.removeFunction(this.fnTranslateLangSelect);
            CKEDITOR.tools.removeFunction(this.fnTranslateLangFrom);
            CKEDITOR.tools.removeFunction(this.fnTranslateLangTo);
            CKEDITOR.tools.removeFunction(this.fnTranslateHeaderUpdate);
        },

        /**
         * @this {Editor}
         */
        onTranslateLangFrom: function(needName) {
            var lang = Array.isArray(this.config.translateFrom) ?
                this.config.translateFrom[ needName ? 1 : 0 ] :
                this.config.translateFrom;

            return lang || 'ru';
        },

        /**
         * @this {Editor}
         */
        onTranslateLangTo: function(needName) {
            var lang = Array.isArray(this.config.translateTo) ?
                this.config.translateTo[ needName ? 1 : 0 ] :
                this.config.translateTo;

            return lang || 'en';
        },

        /**
		 * @param {string} direction from|to
		 * @param {string} currentLang
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
         * @this {Editor}
         */
        onStateShowTranslator: function() {
            var cmdTranslate = this.getCommand(CMD_TRANSLATE);
            var cmdShowTranslator = this.getCommand(CMD_SHOW_TRANSLATOR);
            var wrap = this.ui.space('contents_wrap');

            switch (cmdShowTranslator.state) {
            case CKEDITOR.TRISTATE_ON:
                cmdTranslate.enable();
                wrap.addClass(CLASS_TRANSLATE_WRAP);

                CKEDITOR.tools.callFunction(this.fnTranslateHeaderUpdate);

                wrap.appendHtml(CKEDITOR.getTemplate('translateWrapper').output({
                    wrapId: this.ui.spaceId('translate_wrap'),
                    contentId: this.ui.spaceId('translate_content')
                }));

                cmdTranslate.exec();
                break;

            case CKEDITOR.TRISTATE_OFF:
                cmdTranslate.disable();
                wrap.removeClass(CLASS_TRANSLATE_WRAP);

                var elementHeader = this.ui.space('translate_header');
                elementHeader && elementHeader.remove();

                var elementWrap = this.ui.space('translate_wrap');
                elementWrap && elementWrap.remove();
                break;
            }
        },

        /**
         * @this {CKEDITOR.command}
         */
        onExecTranslate: function(editor, data) {
            if (this.state !== CKEDITOR.TRISTATE_OFF) {
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

            console.log('>> exec', data);

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
         * @this {Editor}
         */
        onAfterCommandExec: function(event) {
            if (event.data.name !== CMD_TRANSLATE) {
                return;
            }

            if (event.data.command.state === CKEDITOR.TRISTATE_DISABLED) {
                return;
            }

            console.log('>> after', event.data.returnValue);
            this.ui.space('translate_content').setHtml(event.data.returnValue);
            event.data.command.setState(CKEDITOR.TRISTATE_OFF)
        },

        /**
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
}());
