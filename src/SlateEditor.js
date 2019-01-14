import { Editor, getEventRange, getEventTransfer } from 'slate-react';
import { Block, Value } from 'slate';
import React, { Component } from 'react';
import initValue from './value.json';
import imageExtensions from 'image-extensions';
import isUrl from 'is-url';
import { isKeyHotkey } from 'is-hotkey';
import { Button, Icon, Toolbar, Image, FileBase64 } from './components';
import './SlateEditor.css';

/**
 * Define the default node type.
 *
 * @type {String}
 */

const DEFAULT_NODE = 'paragraph'

/**
 * Define hotkey matchers.
 *
 * @type {Function}
 */

const isBoldHotkey = isKeyHotkey('mod+b')
const isItalicHotkey = isKeyHotkey('mod+i')
const isUnderlinedHotkey = isKeyHotkey('mod+u')
const isCodeHotkey = isKeyHotkey('mod+`')


/**
 * Has Parent
 * @param value
 * @param type
 * @returns {*}
 */
const hasParentOfType = (value, type) => value.blocks.some(
    block => !!value.document.getClosest(block.key, parent => parent.type === type)
)

/*
 * A function to determine whether a URL has an image extension.
 *
 * @param {String} url
 * @return {Boolean}
 */

function isImage(url) {
    return !!imageExtensions.find(url.endsWith)
}


/**
 * A change function to standardize inserting images.
 *
 * @param {Editor} editor
 * @param {String} src
 * @param {Range} target
 */

function insertImage(editor, src, target) {
    if (target) {
        editor.select(target)
    }

    editor.insertBlock({
        type: 'image',
        data: { src },
    })
}


/**
 * The editor's schema.
 *
 * @type {Object}
 */

const schema = {
    document: {
        last: { type: 'paragraph' },
        normalize: (editor, { code, node, child }) => {
            switch (code) {
                case 'last_child_type_invalid': {
                    const paragraph = Block.create('paragraph')
                    return editor.insertNodeByKey(node.key, node.nodes.size, paragraph)
                }
                default: {
                    return;
                }
            }
        },
    },
    blocks: {
        image: {
            isVoid: true,
        },
    },
}

// Update the initial content to be pulled from Local Storage if it exists.
const existingValue = JSON.parse(localStorage.getItem('content'));
const initialValue = Value.fromJSON(existingValue || initValue);



/**
 * The rich text example.
 *
 * @type {Component}
 */

class slateEditor extends Component {
    /**
     * Deserialize the initial editor value.
     *
     * @type {Object}
     */

    constructor() {
        super();
        this.state = {
            value: initialValue,
            showPopup: false,
            files: []
        };
    }

    /**
     * Check if the current selection has a mark with `type` in it.
     *
     * @param {String} type
     * @return {Boolean}
     */

    hasMark = type => {
        const { value } = this.state
        return value.activeMarks.some(mark => mark.type === type)
    }

    /**
     * Check if the any of the currently selected blocks are of `type`.
     *
     * @param {String} type
     * @return {Boolean}
     */

    hasBlock = type => {
        const { value } = this.state
        return value.blocks.some(node => node.type === type)
    }

    /**
     * Store a reference to the `editor`.
     *
     * @param {Editor} editor
     */

    ref = editor => {
        this.editor = editor
    }





    /**
     * Render.
     *
     * @return {Element}
     */

    render() {
        return (
            <div>
                <Toolbar>
                    {this.renderMarkButton('bold', 'format_bold')}
                    {this.renderMarkButton('italic', 'format_italic')}
                    {this.renderMarkButton('underlined', 'format_underlined')}
                    {this.renderMarkButton('code', 'code')}
                    {this.renderBlockButton('heading-one', 'looks_one')}
                    {this.renderBlockButton('heading-two', 'looks_two')}
                    {this.renderBlockButton('block-quote', 'format_quote')}
                    {this.renderBlockButton('numbered-list', 'format_list_numbered')}
                    {this.renderBlockButton('bulleted-list', 'format_list_bulleted')}
                    <Button onMouseDown={this.onClickImage}>
                        <Icon>add_photo_alternate</Icon>
                    </Button>
                    <FileBase64  class="inputfile inputfile-4"
                                data-multiple-caption="{count} files selected"
                                multiple={ true }
                                onDone={ this.insertImageToEditor.bind(this) } />
                    <Button onClick={this.saveCurrentState}>
                        <span className='button save_button'>Save</span>
                    </Button>
                    <Button onClick={this.cancelCurrentState}>
                        <span className='button cancel_button'>Cancel</span>
                    </Button>
                </Toolbar>
                <Editor
                    spellCheck
                    autoFocus
                    placeholder="Enter some rich text..."
                    ref={this.ref}
                    value={this.state.value}
                    onChange={this.onChange}
                    onKeyDown={this.onKeyDown}
                    renderNode={this.renderNode}
                    renderMark={this.renderMark}
                    schema={schema}
                    onDrop={this.onDropOrPaste}
                    onPaste={this.onDropOrPaste}
                />
            </div>
        )
    }

    /**
     * Render a mark-toggling toolbar button.
     *
     * @param {String} type
     * @param {String} icon
     * @return {Element}
     */

    renderMarkButton = (type, icon) => {
        const isActive = this.hasMark(type)

        return (
            <Button
                active={isActive}
                onMouseDown={event => this.onClickMark(event, type)}
            >
                <Icon>{icon}</Icon>
            </Button>
        )
    }

    /**
     * Render a block-toggling toolbar button.
     *
     * @param {String} type
     * @param {String} icon
     * @return {Element}
     */

    renderBlockButton = (type, icon) => {
        let isActive = this.hasBlock(type)

        if (['numbered-list', 'bulleted-list'].includes(type)) {
            const { value: { document, blocks } } = this.state

            if (blocks.size > 0) {
                const parent = document.getParent(blocks.first().key)
                isActive = this.hasBlock('list-item') && parent && parent.type === type
            }
        }

        return (
            <Button
                active={isActive}
                onMouseDown={event => this.onClickBlock(event, type)}
            >
                <Icon>{icon}</Icon>
            </Button>
        )
    }

    /**
     * Render a Slate node.
     *
     * @param {Object} props
     * @return {Element}
     */

    renderNode = (props, editor, next) => {
        const { attributes, children, node, isFocused } = props

        switch (node.type) {
            case 'block-quote':
                return <blockquote {...attributes}>{children}</blockquote>
            case 'bulleted-list':
                return <ul {...attributes}>{children}</ul>
            case 'heading-one':
                return <h1 {...attributes}>{children}</h1>
            case 'heading-two':
                return <h2 {...attributes}>{children}</h2>
            case 'list-item':
                return <li {...attributes}>{children}</li>
            case 'numbered-list':
                return <ol {...attributes}>{children}</ol>
            case 'image': {
                const src = node.data.get('src')
                return <Image src={src} selected={isFocused} {...attributes} />
            }
            default:
                return next()
        }
    }

    /**
     * Render a Slate mark.
     *
     * @param {Object} props
     * @return {Element}
     */

    renderMark = (props, editor, next) => {
        const { children, mark, attributes } = props

        switch (mark.type) {
            case 'bold':
                return <strong {...attributes}>{children}</strong>
            case 'code':
                return <code {...attributes}>{children}</code>
            case 'italic':
                return <em {...attributes}>{children}</em>
            case 'underlined':
                return <u {...attributes}>{children}</u>
            default:
                return next()
        }
    }

    /**
     * On change, save the new `value`.
     *
     * @param {Editor} editor
     */

    onChange = ({ value }) => {
        this.setState({ value })
    }

    /**
     * On key down, if it's a formatting command toggle a mark.
     *
     * @param {Event} event
     * @param {Editor} editor
     * @return {Change}
     */

    onKeyDown = (event, editor, next) => {
        let mark
        const isList = this.hasBlock('list-item')
        const { value: { blocks } } = this.state;


        if (isBoldHotkey(event)) {
            mark = 'bold'
        } else if (isItalicHotkey(event)) {
            mark = 'italic'
        } else if (isUnderlinedHotkey(event)) {
            mark = 'underlined'
        } else if (isCodeHotkey(event)) {
            mark = 'code'
        } else if (event.key === 'Tab') {
            event.preventDefault();
            if(isList){

                const { value } = editor;
                let listType = '';
                if(hasParentOfType(value, 'numbered-list')){
                    listType = 'numbered-list';
                }else if(hasParentOfType(value, 'bulleted-list')){
                    listType = 'bulleted-list';
                }

                if(blocks.size>0){
                    if (event.shiftKey){
                        editor.unwrapBlock(listType).focus()
                    }else{
                        editor.setBlocks('list-item').wrapBlock(listType).focus();
                    }
                }
            }
            return next()
        } else {
            return next()
        }

        event.preventDefault()
        editor.toggleMark(mark)
    }

    /**
     * When a mark button is clicked, toggle the current mark.
     *
     * @param {Event} event
     * @param {String} type
     */

    onClickMark = (event, type) => {
        event.preventDefault()
        this.editor.toggleMark(type)
    }

    /**
     * When a block button is clicked, toggle the block type.
     *
     * @param {Event} event
     * @param {String} type
     */

    onClickBlock = (event, type) => {
        event.preventDefault()

        const { editor } = this
        const { value } = editor
        const { document } = value

        // Handle everything but list buttons.
        if (type !== 'bulleted-list' && type !== 'numbered-list') {
            const isActive = this.hasBlock(type)
            const isList = this.hasBlock('list-item')

            if (isList) {
                editor
                    .setBlocks(isActive ? DEFAULT_NODE : type)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list')
            } else {
                editor.setBlocks(isActive ? DEFAULT_NODE : type)
            }
        } else {
            // Handle the extra wrapping required for list buttons.
            const isList = this.hasBlock('list-item')
            const isType = value.blocks.some(block => {
                return !!document.getClosest(block.key, parent => parent.type === type)
            })

            if (isList && isType) {
                editor
                    .setBlocks(DEFAULT_NODE)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list')
            } else if (isList) {
                editor
                    .unwrapBlock(
                        type === 'bulleted-list' ? 'numbered-list' : 'bulleted-list'
                    )
                    .wrapBlock(type)
            } else {
                editor.setBlocks('list-item').wrapBlock(type)
            }
        }
    }


    /**
     * On clicking the image button, prompt for an image and insert it.
     *
     * @param {Event} event
     */

    onClickImage = event => {
        event.preventDefault()
        const src = window.prompt('Enter the URL of the image:')
        if (!src) return
        this.editor.command(insertImage, src)
    }

    insertImageToEditor = (files) => {
        const editor = this.editor;
        files.forEach(function (file) {
            // console.log(file);
            editor.command(insertImage, file.base64)
        })

    }

    saveCurrentState = event => {
        event.preventDefault();
        const value = this.state.value;
        const content = JSON.stringify(value.toJSON());
        localStorage.setItem('content', content);
    }

    cancelCurrentState = event => {
        event.preventDefault();
        this.setState({value: Value.fromJSON(initValue)})
        localStorage.removeItem('content');
    }


    /**
     * On drop, insert the image wherever it is dropped.
     *
     * @param {Event} event
     * @param {Editor} editor
     * @param {Function} next
     */

    onDropOrPaste = (event, editor, next) => {
        const target = getEventRange(event, editor)
        if (!target && event.type === 'drop') return next()

        const transfer = getEventTransfer(event)
        const { type, text, files } = transfer

        if (type === 'files') {
            for (const file of files) {
                const reader = new FileReader()
                const [mime] = file.type.split('/')
                if (mime !== 'image') continue

                reader.addEventListener('load', () => {
                    editor.command(insertImage, reader.result, target)
                })

                reader.readAsDataURL(file)
            }
            return
        }

        if (type === 'text') {
            if (!isUrl(text)) return next()
            if (!isImage(text)) return next()
            editor.command(insertImage, text, target)
            return
        }

        next()
    }
}

/**
 * Export.
 */

export default slateEditor