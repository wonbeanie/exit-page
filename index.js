let stageProblem = false;
let stage = 0;

chrome.storage.onChanged.addListener((changes) => {
  if(isChangedValue(changes, "start")){
    if(changes.start.newValue === true){
      stage = 1;
      initGame();
      return;
    }
    else {
      window.location.reload();
    }
  }

  if(isChangedValue(changes, "stage")){
    stage = changes.stage.newValue;
    initGame();
    return;
  }
});

chrome.storage.local.get(null).then(async (result) => {
  if(isValue(result, "start")){
    if(result.start === true){
      gameStateUpdate(result);
    }
  }
});

function isChangedValue(changes, key){
  if(Object.hasOwn(changes, key)){
    if(changes.start){
      if(Object.hasOwn(changes.start, "newValue")){
        return true;
      }
    }
  }

  return false;
}

function isValue(data, key){
  if(Object.hasOwn(data, key)){
    return true;
  }

  return false;
}

function gameStateUpdate(data){
  if(Object.hasOwn(data, "common")){
    if(Object.hasOwn(data, "fail")){
      if(data.fail === true){
        setStorage({
          stage : 1,
          fake : false,
          fail : false
        });
        initGame();
        return;
      }
    }

    if(data.common === true){
      if(data.url === window.location.href){
        const curStage = data.stage || 1;
        if(isEndScore(curStage)){
          gameClear();
          return;
        }
        setStorage({
          stage : curStage + 1,
          common : false
        });
      }
      initGame();
      return;
    }
  }

  if(Object.hasOwn(data, "fake")){
    if(data.fake === true){
      setStorage({
        stage : 1,
        fake : false
      });
      initGame();
      return;
    }
  }

  if(Object.hasOwn(data, "addScore")){
    if(data.addScore === true){
      const curStage = data.stage || 1;
      if(isEndScore(curStage)){
        gameClear();
        return;
      }
      setStorage({
        stage : curStage + 1,
        addScore : false
      });
      initGame();
      return;
    }
  }
}

function isEndScore(score){
  return score === 8;
}

function formatData(changeData = {}){
  let data = {};

  for(const key in changeData){
    data[key] = changeData[key].newValue;
  }

  return data;
}

function getCleanVisibleElements() {
  const allElements = document.querySelectorAll('*');
  const excludeTags = ['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'SVG', 'IFRAME', 'BR'];
  const excludeIds = ['extension-loading-overlay']

  const visibleElemtns = Array.from(allElements).filter(el => {
    if (excludeTags.includes(el.tagName)) return false;

    if (excludeIds.includes(el.id)) return false;

    if (el.offsetWidth <= 10 || el.offsetHeight <= 10) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

    const rect = el.getBoundingClientRect();
    const isInside = rect.bottom > 0 && rect.right > 0 && 
                     rect.left < window.innerWidth && rect.top < window.innerHeight;
    
    if (!isInside) return false;
    const hasText = el.innerText?.trim().length > 0;

    // TODO 이미지 변경 기능
    const isPicture = el.tagName === 'IMG';
    return hasText || isPicture;
    // return hasText;
    // return isPicture;
  });

  const uniqueList = visibleElemtns.filter(parent => {
    return !visibleElemtns.some(child => 
      parent !== child && parent.contains(child)
    );
  });

  return uniqueList;
}

async function gameClear(){
  await setStorage({
    start : false,
    clear : true
  })

  alert("성공!!");
}

function isProblem(state){
  return stageProblem === state;
}

function initGame(){
  showLoading();
  setTimeout(() => {
    if(document.readyState === 'complete'){
      game();
    }
    window.addEventListener('load', async () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => await game());
      }
      else {
        await game();
      }
    });
  }, 2000)
}

function settingGame(){
  const newBody = document.body.cloneNode(true);
  document.body.replaceWith(newBody);

  document.querySelectorAll('iframe').forEach((iframe) => {
    const rect = iframe.getBoundingClientRect();

    const overlay = document.createElement('div');

    Object.assign(overlay.style, {
      position: 'absolute',
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.top + window.scrollY}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      background: '#000',
      zIndex: '2'
    });

    document.body.appendChild(overlay);
  });

  document.addEventListener(
    'click',
    async (e) => {
      if(e.target.closest('[data-fake-element="true"]')) return;
      e.preventDefault();
      e.stopPropagation();

      await setStorage({
        fail : true
      });

      window.location.reload();
    },
    true
  );

  document.querySelectorAll('*').forEach((el) => {
    el.style.animationPlayState = 'paused';
    el.style.transition = 'none';
  });

  document.querySelectorAll('[target="_blank"]').forEach((element) => {
    element.removeAttribute('target');
  });
}

async function game(){
  await waitForImages();

  settingGame();

  const result = getCleanVisibleElements();

  const visibleData = result.map(el => ({
    tag: el.tagName,
    text: el.innerText?.substring(0, 50).trim() || '(내용 없음)',
    className: el.className,
    element : el
  }));

  // const isProblem = !checkChance(40);
  const isProblem = true;

  stageProblem = isProblem;

  const fakeData = getRandomItem(visibleData);
  if(!isProblem || (isProblem && (fakeData == null || fakeData.length === 0))){
    console.log("없음!");
    stageProblem = false;
    await setStorage({
      common : true,
      url : window.location.href
    })
  }
  else {
    console.log("있음!", fakeData.element);
    await setFakeElement(fakeData);

    setTrick(fakeData, visibleData);
  }


  hideLoading();
}

async function setFakeElement(fakeData){
  const fakeElement = fakeData.element;
  await setStorage({
    fake : true,
    url : window.location.href
  });

  fakeElement.addEventListener("click", (e) => {
    e.stopPropagation();
    fakeCorrect(fakeElement);
  }, true);

  fakeElement.dataset.fakeElement = 'true';

  if(fakeElement.tagName === 'IMG'){
    const imgUrl = chrome.runtime.getURL('assets/images.jpg');
    fakeElement.src = imgUrl;

    fakeElement.style.height = "100%";
    fakeElement.style.position = 'absolute';
    fakeElement.style.left = '50%';
    fakeElement.style.top = '50%';
    fakeElement.style.transform = 'translate(-50%, -50%)';
    fakeElement.style.zIndex = '999999';
    return;
  }

  fakeElement.textContent = "exit-8";
}

const checkChance = (percentage) => {
    return Math.random() < (percentage / 100);
};

function getRandomItem(array){
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function setStorage(data){
  return chrome.storage.local.set({
    ...data,
    saveTime : new Date().getTime()
  });
}

async function fakeCorrect(element){
  // TODO : 다른 페이지로 이동 구현
  // if(element.herf){
  //   return;
  // }

  await setStorage({
    fake : false,
    addScore : true
  });
  window.location.reload();
}

function getElementCapacity(element) {
  const style = window.getComputedStyle(element);
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const maxWidth = element.clientWidth;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;

  // 가장 표준적인 글자인 '가' 또는 'A'의 너비를 측정 (평균값 사용)
  const charWidth = context.measureText('가').width;

  // 전체 너비를 글자 하나 너비로 나눔
  return Math.floor(maxWidth / charWidth);
}

function waitForImages() {
  const images = [...document.images].filter((img) => img.loading !== 'lazy');

  return Promise.all(
    images.map((img) => {
      // 이미 로드된 이미지
      if (img.complete) {
        return Promise.resolve();
      }

      // 아직 로드되지 않은 이미지
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    })
  );
}

function showLoading() {
  const overlay = document.createElement('div');

  overlay.id = 'extension-loading-overlay';

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '24px',
    fontWeight: '600',
  });

  overlay.textContent = 'Loading...';

  document.body.appendChild(overlay);
}

function hideLoading() {
  document.querySelector('#extension-loading-overlay')?.remove();
}

function getHoverParents(element) {
  const result = [];

  let current = element.parentElement;

  while (current) {
    if (current.matches(':hover')) {
      result.push(current);
    }

    current = current.parentElement;
  }

  return result;
}

function moveToCenterEvent(element){
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true);

  setTimeout(() => {
    element.style.visibility = "hidden";
    element.parentElement.appendChild(clone);

    document.body.appendChild(clone);

    let style = {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      margin: '0',
      transform: 'none',
      transition: 'left 1s ease, top 1s ease',
      background: "white"
    };

    if(element.tagName === "IMG"){
      const rect = element.getBoundingClientRect();

      style = {
        ...style,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      }
    }

    Object.assign(clone.style, style);

    requestAnimationFrame(() => {
      const x = (window.innerWidth - rect.width) / 2;
      const y = (window.innerHeight - rect.height) / 2;

      clone.style.left = `${x}px`;
      clone.style.top = `${y}px`;
    });

    element.addEventListener('transitionend', () => {
      element.style.display = 'none';
    }, { once: true });
  }, 3000);
}

function sizeUpEvent(element){
  setTimeout(() => {
    element.style.transition = 'transform 10s ease';
    element.style.transform = 'scale(2)';
  }, 3000);
}

function sizeDownEvent(element){
  setTimeout(() => {
    element.style.transition = 'transform 10s ease';
    element.style.transform = 'scale(0)';
  }, 3000);
}

function setTrick(fakeData, visibleData){
  const trickItems = getRandomItems(visibleData, fakeData);

  const tricks = [
    moveToCenterEvent,
    sizeUpEvent,
    sizeDownEvent,
    () => {}
  ];

  for(const item of trickItems){
    const element = item.element;
    const trickIndex = Math.floor(Math.random() * (tricks.length));
    const trick = tricks[trickIndex];
    trick(element);
  }

}

function getRandomItems(array, initData) {
  console.log(array);
  const count = Math.floor(Math.random() * (array.length * 0.5 + 1));
  const result = [initData];

  while (result.length < count) {
    const item = array[Math.floor(Math.random() * array.length)];

    if (!result.includes(item)) {
      result.push(item);
    }
  }

  return result;
}