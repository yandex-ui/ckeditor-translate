(function() {
    'use strict';

    var CMD_TRANSLATE = 'translate';
    var CLASS_TRANSLATE_WRAP = 'cke_contents_wrap_translate';

    CKEDITOR.plugins.add('translate', {
        modes: { wysiwyg: 1, source: 1 },

        onLoad: function() {
            CKEDITOR.addCss(
                '.cke_button__translate_label {display:inline;}' +
                '.cke_button__translate_icon {display:none;}' +
                '.cke_contents_wrap_translate {display:flex;align-items:stretch;}' +
                '.cke_contents_wrap_translate > .cke_contents {flex-grow:1;padding-right:15px;}' +
                '.cke_contents_wrap_translate > .cke_translate_wrap {flex-grow:1;padding-left:15px;position:relative;}' +
                '.cke_contents_wrap_translate > .cke_translate_wrap:before {content:"";position:absolute;display:block;top:0;left:0;bottom:25%;border-left: 1px solid #ccc;}'
            );

            CKEDITOR.plugins.setLang('translate', 'ru', {
                'translator': 'Переводчик'
            });
        },

        init: function(editor) {
            var lang = editor.lang.translate;
            var wrapId = editor.ui.spaceId('translate_wrap');
            var contentId = editor.ui.spaceId('translate_content');

            function createTranslateWrapper() {
                return CKEDITOR.dom.element.createFromHtml(
                    '<div id="' + wrapId + '" class="cke_translate_wrap">' +
                        '<div id="' + contentId + '" class="cke_translate_content">' +
                        '</div>' +
                    '</div>'
                );
            }

            var cmdTranslate = editor.addCommand(CMD_TRANSLATE, {
                modes: { wysiwyg: 1, source: 1 },
                editorFocus: false,
                canUndo: false,
                exec: function(editor) {
                    var wrap = editor.ui.space('contents_wrap');

                    if (this.state === CKEDITOR.TRISTATE_ON) {
                        this.setState(CKEDITOR.TRISTATE_OFF);
                        wrap.removeClass(CLASS_TRANSLATE_WRAP);

                        editor.ui.space('translate_wrap').remove();

                    } else if (this.state === CKEDITOR.TRISTATE_OFF) {
                        this.setState(CKEDITOR.TRISTATE_ON);
                        wrap.addClass(CLASS_TRANSLATE_WRAP);

                        editor.ui.space('contents_wrap').append(createTranslateWrapper());
                    }
                }
            });

            editor.ui.addButton('Translate', {
                label: lang.translator,
                title: lang.translator,
                icon: null,
                command: CMD_TRANSLATE
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
