const startElement = document.getElementById("start");
const endElement = document.getElementById("end");
const stageNumElement = document.getElementById("stage-num");
const stageElement = document.getElementById("stage");
const logElement = document.getElementById("log");

let stage = 1;

chrome.storage.onChanged.addListener((changes) => {
  console.log("changes", changes);

  if(Object.hasOwn(changes, "clear")){
    if(Object.hasOwn(changes.clear, "newValue")){
      if(changes.clear.newValue === true){
        showGameClaer();
        return;
      }
    }
  }

  if(Object.hasOwn(changes, "start")){
    if(Object.hasOwn(changes.start, "newValue")){
      if(changes.start.newValue === true){
        showGameStartUI();
        return;
      }
      gameStop();
      return;
    }
  }

  if(Object.hasOwn(changes, "stage")){
    if(Object.hasOwn(changes.stage, "newValue")){
      stage = changes.stage.newValue;
      showGameStartUI();
      return;
    }
  }
})

chrome.storage.local.get(null).then((result) => {
  if(Object.hasOwn(result, "start")){
    if(result.start === true){
      if(Object.hasOwn(result, "stage")){
        if(result.stage > 1){
          stage = result.stage;
        }
      }
      showGameStartUI();
      return;
    }
    gameStop();
    return;
  }
});

startElement.addEventListener("click", function(){
  chrome.storage.local.set({
    "start" : true,
    "common" : false,
    "fake" : false,
    "stage" : 1
  });

  window.close();
});

endElement.addEventListener("click", function(){
  chrome.storage.local.set({
    "start" : false
  });
  
  window.close();
});

function showGameStartUI(){
  stageElement.classList.remove("hide");
  stageNumElement.textContent = stage;
}

function hideGameStateUI(){
  stageElement.classList.add("hide");
  stageNumElement.textContent = 1;
}

function gameStop(){
  chrome.storage.local.clear();
  stage = 1;
  hideGameStateUI();
}

function showGameClaer(){
  stageNumElement.textContent = "성공!";
  chrome.storage.local.clear();
}