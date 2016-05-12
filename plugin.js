(function() {
    'use strict';

    CKEDITOR.config.translateFrom = [ 'ru', 'русский' ];
    CKEDITOR.config.translateTo = [ 'en', 'английский' ];

    CKEDITOR.config.translate = function(data, from, to) {
        return new vow.Promise(function(resolve) {
            resolve(data);
        });
    };

    var CMD_TRANSLATE = 'translate';
    var CLASS_TRANSLATE_WRAP = 'cke_contents_wrap_translate';

    var TMPL_WRAPPER = CKEDITOR.addTemplate(
        'translateWrapper',
        '<div id="{wrapId}" class="cke_translate_wrap">' +
            '<div id="{contentId}" class="cke_translate_content"></div>' +
        '</div>'
    );

    var TMPL_HEADER = CKEDITOR.addTemplate(
        'translateHeader',
        '<div id="{headerId}" class="cke_translate_header">' +
            '<div class="cke_translate_header_from">' +
                '<span class="cke_translate_lang" onclick="CKEDITOR.tools.callFunction({clickLangFn}, this, \'from\'); return false;">русский</span>' +
            '</div>' +
            '<div class="cke_translate_header_to">' +
                '<span class="cke_translate_lang" onclick="CKEDITOR.tools.callFunction({clickLangFn}, this, \'to\'); return false;">английский</span>' +
            '</div>' +
            '<div class="cke_translate_header_info">' +
                '<a href="#">[i]</a>' +
            '</div>' +
        '</div>'
    );

    CKEDITOR.plugins.add('translate', {
        modes: { wysiwyg: 1, source: 1 },

        onLoad: function() {
            CKEDITOR.addCss(
                '.cke_button__translate_label {display:inline;}' +
                '.cke_button__translate_icon {display:none;}' +
                '.cke_contents_wrap_translate {display:flex;align-items:stretch;}' +
                '.cke_contents_wrap_translate > .cke_contents {flex-grow:1;padding-right:15px;}' +
                '.cke_contents_wrap_translate > .cke_translate_wrap {flex-grow:1;padding-left:15px;position:relative;}' +
                '.cke_contents_wrap_translate > .cke_translate_wrap:before {content:"";position:absolute;display:block;top:0;left:0;bottom:25%;border-left: 1px solid #ccc;}' +

                '.cke_translate_header {position:relative;display:flex;justify-content:center;text-transform:uppercase;color:#999;margin:5px 0;}' +
                '.cke_translate_header_info {position:absolute;right:0;}' +
                '.cke_translate_header_from {flex-basis:50%;text-align:right;margin-right:15px;}' +
                '.cke_translate_header_to {flex-basis:50%;margin-left:15px;}' +

                '.cke_translate_lang {cursor:pointer;}' +
                '.cke_translate_lang:hover {color:#000;}'
            );

            CKEDITOR.plugins.setLang('translate', 'ru', {
                'translator': 'Переводчик'
            });
        },

        init: function(editor) {
            var lang = editor.lang.translate;
            var wrapId = editor.ui.spaceId('translate_wrap');
            var contentId = editor.ui.spaceId('translate_content');
            var headerId = editor.ui.spaceId('translate_header');

            var clickLangFn = CKEDITOR.tools.addFunction(function() {

			});

            var cmdTranslate = editor.addCommand(CMD_TRANSLATE, {
                modes: { wysiwyg: 1, source: 1 },
                editorFocus: false,
                canUndo: false,
                exec: function(editor) {
                    var wrap = editor.ui.space('contents_wrap');

                    if (this.state === CKEDITOR.TRISTATE_ON) {
                        this.setState(CKEDITOR.TRISTATE_OFF);
                        wrap.removeClass(CLASS_TRANSLATE_WRAP);

                        editor.ui.space('translate_header').remove();
                        editor.ui.space('translate_wrap').remove();

                    } else if (this.state === CKEDITOR.TRISTATE_OFF) {
                        this.setState(CKEDITOR.TRISTATE_ON);
                        wrap.addClass(CLASS_TRANSLATE_WRAP);

                        editor.ui.space('top').appendHtml(TMPL_HEADER.output({
                            headerId: headerId,
                            clickLangFn: clickLangFn
                        }));

                        wrap.appendHtml(TMPL_WRAPPER.output({
                            wrapId: wrapId,
                            contentId: contentId
                        }));
                    }
                }
            });

            editor.ui.addButton('Translate', {
                label: lang.translator,
                title: lang.translator,
                icon: null,
                command: CMD_TRANSLATE
            });

            editor.on('destroy', function() {
				CKEDITOR.tools.removeFunction(clickLangFn);
			});

            // editor.on('loaded', this.onLoaded);
            // editor.on('mode', this.onMode);
            // editor.on('beforeSetMode', this.onBeforeSetMode);
            // editor.on('destroy', this.onDestroy);
        },

        onExecTranslate: function() {

        }
    });
}());
