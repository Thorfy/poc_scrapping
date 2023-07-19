// TODO find better way, to avoid window.chrome....
interface Window {
    chrome :any;
}
const extensionId = 'statsSeloger';

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

const container = document.createElement('div') as HTMLDivElement;
container.id = extensionId;
document.body.append(container);

const logo = new Image();
logo.src = window.chrome.runtime.getURL('img/icon-48.png');
container.append(logo);

let maxZindex = 0;
document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const z = parseInt(s.getPropertyValue('z-index'));
    if(z && z > maxZindex) { maxZindex = z; }
});
container.style.zIndex = `${maxZindex + 1}`;

console.log(window.chrome.i18n.getMessage('jsTestLang'));