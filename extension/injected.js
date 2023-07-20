"use strict";
const version = '0.0.0';
const extensionId = 'PropertEase';
const host = '#';
const storage = window.chrome.storage.local;
const confVersion = `${version.split('.')[0]}.${version.split('.')[1]}`;
const storageKeyConfjson = `confjson-${confVersion}`;
function getXpathNodes(expression, context = document.body) {
    return document.evaluate(expression, context, null, XPathResult.ANY_TYPE, null);
}
function log(options) {
    const colorType = {
        success: { str: 's', c: '#292929', bgc: '#6BEC7C' },
        info: { str: 'i', c: '#292929', bgc: '#00b0b0' },
        warning: { str: 'w', c: '#fff', bgc: '#ed7d04' },
        error: { str: 'e', c: '#fff', bgc: '#f00' }
    };
    let { type, data } = options;
    type = type || 'info';
    let log = [
        `%c${extensionId}%c${colorType[type].str}`,
        `color: #fff; padding: 1px 3px; border-radius: 3px 0 0 3px; background: #0000bd;`,
        `color: ${colorType[type].c}; padding: 1px 3px; border-radius: 0 3px 3px 0; background: ${colorType[type].bgc};`
    ];
    if (data) {
        log = log.concat(data);
    }
    console.log.apply(console, log);
}
function fetchConfJson() {
    return new Promise(res => {
        const v = version.split('.');
        log({ data: `fetching conf JSON : ${confVersion}` });
        fetch(`${host}/rle/getConf/?v=${confVersion}`)
            .then(res => {
            if (!res.ok) {
                throw 'error fetching conf JSON';
            }
            return res.json();
        })
            .then((data) => {
            if (data === 'error') {
                log({ data: 'fetched conf JSON returned an error' });
            }
            if (data !== 'error') {
                storage.set({ [storageKeyConfjson]: data });
                res(data);
            }
        })
            .catch(e => {
            log({ type: 'error', data: e });
        });
    });
}
function getConfJson() {
    return new Promise((res, rej) => {
        storage.get(storageKeyConfjson)
            .then(({ [storageKeyConfjson]: data }) => {
            if (!data) {
                fetchConfJson()
                    .then(data => {
                    log({ type: 'success', data: 'fetched conf JSON' });
                    res(data);
                })
                    .catch(e => {
                    rej(e);
                });
            }
            else {
                log({ data: 'conf JSON alredy in cache' });
                res(data);
            }
        });
    });
}
let currentConf = {};
getConfJson()
    .then(datas => {
    log({ data: datas });
    datas.forEach(data => {
        if (new URL(window.location.href).host.endsWith(data.host)) {
            currentConf = data;
        }
    });
    log({ type: 'success', data: 'current conf' });
    log({ type: 'success', data: currentConf });
})
    .catch(e => {
    log({ type: 'error', data: e });
});
const style = document.createElement('style');
style.textContent = `
#${extensionId} {
all: initial;
position:fixed;
top:0;
left:0;
height:50px;
}
#${extensionId} img {
all: initial;
height: 100%;
max-width: fit-content;
}
`;
document.body.append(style);
const container = document.createElement('div');
container.id = extensionId;
document.body.append(container);
const logo = new Image();
logo.src = window.chrome.runtime.getURL('img/icon-48.png');
container.append(logo);
let maxZindex = 0;
document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const z = parseInt(s.getPropertyValue('z-index'));
    if (z && z > maxZindex) {
        maxZindex = z;
    }
});
container.style.zIndex = `${maxZindex + 1}`;
container.addEventListener('click', () => {
    storage.remove([storageKeyConfjson]);
    log({ data: 'json conf removed from storage.' });
});
log({ type: 'success', data: window.chrome.i18n.getMessage('jsTestLang') });
