let stageProblem = false;
let stage = 0;

chrome.storage.onChanged.addListener((changes) => {
  if(Object.hasOwn(changes, "start")){
    if(Object.hasOwn(changes.start, "newValue")){
      if(changes.start.newValue === true){
        stage = 1;
        initGame();
        return;
      }
    }
  }

  if(Object.hasOwn(changes, "stage")){
    if(Object.hasOwn(changes.stage, "newValue")){
      stage = changes.stage.newValue;
      initGame();
      return;
    }
  }
});

chrome.storage.local.get(null).then(async (result) => {
  if(Object.hasOwn(result, "start")){
    if(result.start === true){
      gameStateUpdate(result);
    }
  }
});

function gameStateUpdate(data){
  if(Object.hasOwn(data, "common")){
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
      return;
    }
  }

  if(Object.hasOwn(data, "fake")){
    if(data.fake === true){
      setStorage({
        stage : 1,
        fake : false
      });
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
      return;
    }
  }

  initGame();
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

  const visibleElemtns = Array.from(allElements).filter(el => {
    if (excludeTags.includes(el.tagName)) return false;

    if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

    const rect = el.getBoundingClientRect();
    const isInside = rect.bottom > 0 && rect.right > 0 && 
                     rect.left < window.innerWidth && rect.top < window.innerHeight;
    
    if (!isInside) return false;
    const hasText = el.innerText?.trim().length > 0;

    // TODO 이미지 변경 기능
    // const isPicture = el.tagName === 'IMG';
    // return hasText || isPicture;
    return hasText;
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
}

async function game(){
  const result = getCleanVisibleElements();

  const visibleData = result.map(el => ({
    tag: el.tagName,
    text: el.innerText?.substring(0, 50).trim() || '(내용 없음)',
    className: el.className,
    element : el
  }));

  const isProblem = !checkChance(0);

  stageProblem = isProblem;

  if(!isProblem){
    await setStorage({
      common : true,
      url : window.location.href
    })
    return;
  }

  const fakeData = getRandomItem(visibleData);
  await setFakeElement(fakeData);
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

  if(fakeElement.tagName === 'IMG'){
    const imgUrl = chrome.runtime.getURL('picture.png');
    fakeElement.src = imgUrl;
    return;
  }

  fakeElement.textContent = "텍스트";
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