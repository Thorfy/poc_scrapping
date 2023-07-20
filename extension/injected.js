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
function fetchConfJson() {
    return new Promise(res => {
        const v = version.split('.');
        fetch(`${host}rle/getConf/?v=${confVersion}`)
            .then(res => {
            if (!res.ok) {
                throw 'error fetching conf JSON';
            }
            return res.json();
        })
            .then((data) => {
            if (data !== 'error') {
                storage.set({ [storageKeyConfjson]: data });
                res(data);
            }
        })
            .catch(e => {
            console.log(e);
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
                    res(data);
                })
                    .catch(e => {
                    rej(e);
                });
            }
            else {
                res(data);
            }
        });
    });
}
let currentConf = {};
getConfJson()
    .then(datas => {
    datas.forEach(data => {
        if (new URL(window.location.href).host.endsWith(data.host)) {
            currentConf = data;
        }
    });
    console.log('current conf', currentConf);
})
    .catch(e => {
    console.log(e);
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
console.log(window.chrome.i18n.getMessage('jsTestLang'));
