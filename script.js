// ==UserScript==
// @name        YouTube Super Chat convert
// @description
// @namespace   lei.z
// @include     https://www.youtube.com/live_chat*
// @include     https://www.youtube.com/live_chat_replay*
// @version     0.1
// @grant       none
// ==/UserScript==

(function () {
    const SCRIPTID = 'YouTubeSuperChatConvert';
    const DEBUG = false;

    const ratios = {
        "CA$": 5.27,
        "$": 6.47,
        "A$": 5.02,
        "NT$": 0.23,
        "HK$": 0.83,
        "R$": 1.19,
        "¥": 0.059,
        "SGD": 4.87,
        "€": 7.8,
        "NZ$": 4.66,
        "SEK": 0.77,
        "£": 9.00,
        "PEN": 1.71,
        "₱": 0.021,
        "₩": 0.0058,
        "CHF": 7.09,
        "DKK": 1.05,
        "CZK": 0.30,
        "₹": 0.088,
    };
    if (console.time) console.time(SCRIPTID);
    const site = {
        targets: {
            itemsNode: () => $('yt-live-chat-item-list-renderer #items'),
        },
        get: {
            superChatItems: (items) => items.querySelectorAll('.yt-live-chat-item-list-renderer #purchase-amount, #purchase-amount-chip'),/* existing items */
            superChatItem: (node) => node.querySelector('.yt-live-chat-item-list-renderer #purchase-amount, #purchase-amount-chip'),/* for observer */
        },
    };
    let elements = {};
    const core = {
        initialize: function () {
            elements.html = document.documentElement;
            elements.html.classList.add(SCRIPTID);
            core.ready();
        },
        ready: function () {
            core.getTargets(site.targets).then(() => {
                log("I'm ready.");
                core.observeChatItems();
            });
        },
        observeChatItems: function () {
            let containers = site.get.superChatItems(elements.itemsNode);
            Array.from(containers).forEach(container => {
                log(container)
                core.changeText(container);
            });
            observe(elements.itemsNode, function (records) {
                records.forEach(r => r.addedNodes.forEach(node => {
                    let container = site.get.superChatItem(node);
                    if (container) core.changeText(container);
                }));
            });
        },
        changeText: function (div) {
            const number = div.innerHTML.match(/\d+.*/)[0].trim().replace(',', '')
            const curr_variant = div.innerHTML.match(/^[^0-9]*/)[0].replace(/&nbsp;/g,'').trim()
            const ratio = ratios[curr_variant] || 0
            if (ratio === 0) log(curr_variant)
            div.innerHTML += ` ~ CNY ${(number * ratio).toFixed(2)}`
        },
        getTarget: function (selector, retry = 10) {
            const key = selector.name;
            const get = function (resolve, reject, retry) {
                let selected = selector();
                if (selected && selected.length > 0) selected.forEach((s) => s.dataset.selector = key);/* elements */
                else if (selected instanceof HTMLElement) selected.dataset.selector = key;/* element */
                else if (--retry) return log(`Not found: ${key}, retrying... (${retry})`), setTimeout(get, 1000, resolve, reject, retry);
                else return reject(selector);
                elements[key] = selected;
                resolve(selected);
            };
            return new Promise(function (resolve, reject) {
                get(resolve, reject, retry);
            }).catch(selector => {
                log(`Not found: ${key}, I give up.`);
            });
        },
        getTargets: function (selectors, retry = 10) {
            return Promise.all(Object.values(selectors).map(selector => core.getTarget(selector, retry)));
        },
    };
    const $ = function (s, f) {
        let target = document.querySelector(s);
        if (target === null) return null;
        return f ? f(target) : target;
    };
    const $$ = function (s, f) {
        let targets = document.querySelectorAll(s);
        return f ? Array.from(targets).map(t => f(t)) : targets;
    };
    const observe = function (element, callback, options = { childList: true, attributes: false, characterData: false, subtree: false }) {
        let observer = new MutationObserver(callback.bind(element));
        observer.observe(element, options);
        return observer;
    };
    const log = function () {
        if (!DEBUG) return;
        let l = log.last = log.now || new Date(), n = log.now = new Date();
        let error = new Error(), line = log.format.getLine(error), callers = log.format.getCallers(error);
        //console.log(error.stack);
        console.log(
            SCRIPTID + ':',
            /* 00:00:00.000  */ n.toLocaleTimeString() + '.' + n.getTime().toString().slice(-3),
            /* +0.000s       */ '+' + ((n - l) / 1000).toFixed(3) + 's',
            /* :00           */ ':' + line,
            /* caller.caller */(callers[2] ? callers[2] + '() => ' : '') +
            /* caller        */ (callers[1] || '') + '()',
            ...arguments
        );
    };

    log.formats = [{
        name: 'Firefox Scratchpad',
        detector: /MARKER@Scratchpad/,
        getLine: (e) => e.stack.split('\n')[1].match(/([0-9]+):[0-9]+$/)[1],
        getCallers: (e) => e.stack.match(/^[^@]*(?=@)/gm),
    }, {
        name: 'Firefox Console',
        detector: /MARKER@debugger/,
        getLine: (e) => e.stack.split('\n')[1].match(/([0-9]+):[0-9]+$/)[1],
        getCallers: (e) => e.stack.match(/^[^@]*(?=@)/gm),
    }, {
        name: 'Firefox Greasemonkey 3',
        detector: /\/gm_scripts\//,
        getLine: (e) => e.stack.split('\n')[1].match(/([0-9]+):[0-9]+$/)[1],
        getCallers: (e) => e.stack.match(/^[^@]*(?=@)/gm),
    }, {
        name: 'Firefox Greasemonkey 4+',
        detector: /MARKER@user-script:/,
        getLine: (e) => e.stack.split('\n')[1].match(/([0-9]+):[0-9]+$/)[1] - 500,
        getCallers: (e) => e.stack.match(/^[^@]*(?=@)/gm),
    }, {
        name: 'Firefox Tampermonkey',
        detector: /MARKER@moz-extension:/,
        getLine: (e) => e.stack.split('\n')[1].match(/([0-9]+):[0-9]+$/)[1] - 6,
        getCallers: (e) => e.stack.match(/^[^@]*(?=@)/gm),
    }, {
        name: 'Chrome Console',
        detector: /at MARKER \(<anonymous>/,
        getLine: (e) => e.stack.split('\n')[2].match(/([0-9]+):[0-9]+\)?$/)[1],
        getCallers: (e) => e.stack.match(/[^ ]+(?= \(<anonymous>)/gm),
    }, {
        name: 'Chrome Tampermonkey',
        detector: /at MARKER \(chrome-extension:.*?\/userscript.html\?id=/,
        getLine: (e) => e.stack.split('\n')[2].match(/([0-9]+):[0-9]+\)?$/)[1] - 5,
        getCallers: (e) => e.stack.match(/[^ ]+(?= \(chrome-extension:)/gm),
    }, {
        name: 'Chrome Extension',
        detector: /at MARKER \(chrome-extension:/,
        getLine: (e) => e.stack.split('\n')[2].match(/([0-9]+):[0-9]+\)?$/)[1],
        getCallers: (e) => e.stack.match(/[^ ]+(?= \(chrome-extension:)/gm),
    }, {
        name: 'Edge Console',
        detector: /at MARKER \(eval/,
        getLine: (e) => e.stack.split('\n')[2].match(/([0-9]+):[0-9]+\)$/)[1],
        getCallers: (e) => e.stack.match(/[^ ]+(?= \(eval)/gm),
    }, {
        name: 'Edge Tampermonkey',
        detector: /at MARKER \(Function/,
        getLine: (e) => e.stack.split('\n')[2].match(/([0-9]+):[0-9]+\)$/)[1] - 4,
        getCallers: (e) => e.stack.match(/[^ ]+(?= \(Function)/gm),
    }, {
        name: 'Safari',
        detector: /^MARKER$/m,
        getLine: (e) => 0,
        getCallers: (e) => e.stack.split('\n'),
    }, {
        name: 'Default',
        detector: /./,
        getLine: (e) => 0,
        getCallers: (e) => [],
    }];
    log.format = log.formats.find(function MARKER(f) {
        if (!f.detector.test(new Error().stack)) return false;
        //console.log('////', f.name, 'wants', 0/*line*/, '\n' + new Error().stack);
        return true;
    });

    core.initialize();
    if (console.timeEnd) console.timeEnd(SCRIPTID);
})();