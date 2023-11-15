"use strict";
const propertEase = {};
const extensionId = window.chrome.i18n.getMessage('manifestAppName');
const storage = window.chrome.storage.local;
const storageKeyConfjson = `confjson-${chrome.runtime.getManifest().version}`;
const currentURL = new URL(window.location.href);
// storage.clear();

function showExtension() {
    const style = document.createElement('style');
    style.textContent = `
#${extensionId} {
all: initial;
position:fixed;
top:0;
left:0;
max-width:500px;
background-color: #ccc;
border: 1px solid black;
box-shadow: 3px 3px 3px #000;
padding: 10px;
}
#${extensionId} img {
all: initial;
height: 100%;
aspect-ratio: 1/1;
transform: rotateY(45deg);
animation: rotateAnimation 5s linear infinite;
}
@keyframes rotateAnimation {
from {transform: rotateY(0deg);}
to {transform: rotateY(360deg);}
}
`;
    document.body.append(style);
    const extContainer = document.createElement('div');
    extContainer.id = extensionId;
    document.body.append(extContainer);

    let maxZindex = 0;
    document.querySelectorAll('*').forEach(el => {
        const s = getComputedStyle(el);
        const z = parseInt(s.getPropertyValue('z-index'));
        if (z && z > maxZindex) {
            maxZindex = z;
        }
    });
    extContainer.style.zIndex = `${maxZindex + 1}`;

    const logo = new Image();
    logo.src = window.chrome.runtime.getURL('img/icon-48.png');
    extContainer.append(logo);

    const text = document.createElement('div');
    text.textContent = `> display infos [extensionName] found <`;
    text.style.textDecoration = 'underline';
    extContainer.append(text);
    text.addEventListener('pointerup', () => {
        text.textContent = 'getting infos ...';
        extensionName.getInfos()
            .then(datas => {
                datas.forEach(data => {
                   const date = new Date(data.lastSeen);
                   const div = document.createElement('div');
                   text.append(div);
                   const spanDate = document.createElement('span');
                   spanDate.textContent = `le ${date.getDate()}/${date.getMonth()+1}`;
                   div.append(spanDate);
                   const spanPrice = document.createElement('span');
                   spanPrice.style.marginLeft = '10px';
                   spanPrice.textContent = data.price;
                   div.append(spanPrice);
                });
            })
            .catch(() => {
                text.textContent = 'oups, something went wrong !';
            })
    });

    /*extContainer.addEventListener('click', () => {
        storage.clear();
    });*/
}

class ExtensionName {
    #version = chrome.runtime.getManifest().version;
    #API = {
        a:`https://propertease.s3.eu-north-1.amazonaws.com/conf-v${chrome.runtime.getManifest().version}.json`, // JSON conf
        b:'https://sipesjtvg7.execute-api.eu-north-1.amazonaws.com/items' // bdd access
    };
    #currentId = '';
    #currentConf = {};
    #currentHost = '';
    #pageDatas = [];
    #log(options) {
        const logConfig = {
            success:{str: 's', c: '120'},
            info:   {str: 'i', c: '180'},
            warning:{str: 'w', c: '30'},
            error:  {str: 'e', c: '0'}
        };
        let {type, data} = options;
        type = type || 'info';
        let log = [
            `%c${extensionId}%c${logConfig[type].str}`,
            `color: #fff; padding: 1px 3px; border-radius: 3px 0 0 3px; background: linear-gradient(160deg, coral 0%, midnightblue 60%);`,
            `color: hsl(${logConfig[type].c}, 50%, 20%); padding: 1px 3px; border-radius: 0 3px 3px 0; background: hsl(${logConfig[type].c}, 50%, 70%);`
        ];
        if (data) {
            log = log.concat(data);
        }
        console.log.apply(console, log);
    }
    #getXpathNodes (expression, context = document) {
        return document.evaluate(expression, context, null, XPathResult.ANY_TYPE, null);
    }
    #setConf() {
        this.#log({data:'setConf'});
        return new Promise((res, rej) => {
            storage.get(storageKeyConfjson)
                .then(({[storageKeyConfjson]: data}) => {
                    if (!data) {
                        this.#log({data:'conf not found in cache'});
                        this.#fetchConf()
                            .then(data => {
                                res(data);
                            })
                            .catch(e => {
                                rej(e);
                            });
                    } else {
                        this.#log({data: 'conf alredy in cache'});
                        res(data);
                    }
                });
        });
    }
    #fetchConf() {
        this.#log({data:'fetchConf'});
        return new Promise(res => {
            this.#log({data: `fetching conf JSON : ${this.#version}`});
            fetch(this.#API.a.replace('[[version]]', this.#version))
                .then(res => {
                    if (!res.ok) {
                        throw 'error fetching conf JSON';
                    }
                    return res.json();
                })
                .then(data => {
                    storage.set({[storageKeyConfjson]: data});
                    this.#log({type: 'success', data: 'fetched conf JSON'});
                    res(data);
                })
                .catch(e => {
                    this.#log({type: 'error', data: e});
                });
        });
    }
    #sendDatas () {
        if(!this.#pageDatas.length) {
            this.#log({type:'warning', data:'sendDatas : no datas to send !'});
            return;
        }
        this.#log({data:'sendDatas'});
        this.#pageDatas.forEach(data => {
            data.url = `${currentURL.origin}${currentURL.pathname}`;
            data.lastSeen = new Date().getTime();
            data.host = this.#currentHost;
            data.site_bid = `${this.#currentHost}_${data.bid}`;
        });
        this.#log({data:JSON.stringify(this.#pageDatas)});
        fetch(this.#API.b, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.#pageDatas)
        })
            .then(res => {
                if(!res.ok) {
                    throw 'api error';
                }
                this.#log({type:'success', data:'sendDatas'});
            })
            .catch(e => {
                this.#log({type:'error', data:'sendDatas'});
            });
    }
    #updateCurrentConfWithUrl() {
        this.#currentConf = this.#currentConf.pages.filter(x => {
            if (new RegExp(x.url_pattern).test(currentURL.href)) {
                return x;
            }
        })[0];
        this.#log({data:'page conf filtered'});
    }
    #findElements() {
        this.#log({data:'find elements'});
        if(Object.keys(this.#currentConf.xpaths).some(k => k === 'xpaths')) {
            // loop through...
            const nodes = this.#getXpathNodes(this.#currentConf.xpaths.pattern);
            let node = nodes.iterateNext();
            while(node) {
                const obj = {};
                for(let k in this.#currentConf.xpaths.xpaths) {
                        try {
                            const el = this.#getXpathNodes(this.#currentConf.xpaths.xpaths[k], node);
                            if(el.resultType === 2) {
                                obj[k] = el.stringValue;
                            } else {
                                const test = el.iterateNext();
                                if(test) {
                                    obj[k] = test.textContent;
                                }
                            }
                            if(obj[k] === '') {
                                obj[k] = 0;
                            }
                        } catch(e) {
                            obj[k] = 0;
                        }
                }
                this.#pageDatas.push(obj);
                node = nodes.iterateNext();
            }
        } else {
            // single element
            const obj = {};
            for(let k in this.#currentConf.xpaths) {
                try {
                    const el = this.#getXpathNodes(this.#currentConf.xpaths[k]);
                    if(el.resultType === 2) {
                        obj[k] = el.stringValue;
                    } else {
                        const test = el.iterateNext();
                        if(test) {
                            obj[k] = test.textContent;
                        }
                    }
                    if(obj[k] === '') {
                        obj[k] = 0;
                    }
                } catch(e) {
                    obj[k] = 0;
                }
            }
            this.#currentId = obj.bid || '';
            this.#pageDatas.push(obj);
            showExtension();
        }
        this.#sendDatas();
    }
    constructor() {
        this.#setConf()
            .then(datas => {
                datas.confs.forEach(data => {
                    if (currentURL.host.endsWith(data.host)) {
                        this.#currentConf = data;
                    }
                });
                if (Object.keys(this.#currentConf).length > 0) {
                    this.#currentHost = this.#currentConf.host;
                    this.#log({type: 'success', data: `conf domain found for ${this.#currentHost}`});
                    this.#updateCurrentConfWithUrl();
                    if(this.#currentConf) { // a page pattern has been found after updateCurrentConfWithUrl()
                        setTimeout(() => {
                            if (Object.keys(this.#currentConf).length) {
                                this.#findElements();
                            }
                        }, this.#currentConf.delay);
                    } else {
                        this.#log({type:'warning', data:'no conf found for this page.'});
                    }
                }
            });
    }
    getInfos() {
        if(this.#currentId === '') {
            return new Promise.reject();
        }
        return new Promise((res, rej) => {
            fetch(`${this.#API.b}?site_bid=${this.#currentHost}_${this.#currentId}`)
                .then(res => {
                    if(!res.ok) {
                        throw 'api error';
                    }
                    return res.json();
                })
                .then(data => {
                    res(data.filter(x => x.bid === this.#currentId));
                })
                .catch(e => {
                    rej(e);
                });
        })
    }
}

const extensionName = new ExtensionName();