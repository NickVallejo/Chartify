const pathArray = window.location.pathname.split('/')
const topWrapper = document.querySelector('.top_wrapper')
const chartNamesWrapper = document.querySelector('.chart_names')
const frontEndTitle = document.querySelector(".chart_title")
const ytWrap = document.querySelector('.yt-wrap')

const user = pathArray[1]
const chart = pathArray[3]

//! FIGURE OUT WHY THESE CANT IMPORT
// import addtileListeners from './chartSizeSet.js'
// import tileSettings from './tileSettings.js'

function tileSettings(e) {

    console.log(window.viewChart, 'YA')

    if(e.target.classList.contains("frontPlay")){
        let ytSearch = new XMLHttpRequest()
        let ytAlbum
  
        ytAlbum = window.viewChart[e.target.parentNode.getAttribute('rank')]
        console.log(ytAlbum)
  
        ytSearch.open("GET", `http://localhost:4000/yt-listen?artist=${ytAlbum.artist}&album=${ytAlbum.album_name}`)
        ytSearch.onload = () => {
  
          let ytExit
          let ytVid
  
          const url = ytSearch.responseText.replace("watch?v=", "embed/")
          ytWrap.innerHTML = `<div class="yt-vid"><p class="yt-exit">X</p><iframe width="560" height="315" src=${url}?rel=0&controls=1&autoplay=1&mute=0 allow="autoplay" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
          ytExit = document.querySelector('.yt-exit')
          ytVid = document.querySelector('.yt-vid')
          
          ytExit.addEventListener('click', () => {
              ytVid.remove()
          })
        }
        ytSearch.send()
    }
  }

function addtileListeners(){
    const all_top = document.querySelectorAll(".top")
    all_top.forEach((top) => {
      top.addEventListener("click", tileSettings)
    })
    console.log('listeners added', all_top)
  }


const getViewData = async () => {

    const req = new XMLHttpRequest();
    req.open('GET', `http://localhost:4000/profile/onechart?username=${user}&chartname=${chart}`)
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
    req.onload = () => {
        const view = JSON.parse(req.responseText)
        showViewData(view.user, view.chart)
        window.viewChart = JSON.parse(view.chart.chart)
        console.log(window.viewChart, 'YA')
    }
    
    req.send()
}

const showViewData = (user, chart) => {

    const viewChart = JSON.parse(chart.chart)
  
  //check if the name attr of the clicked save matches one in the saved array, then add it to a new array

    frontEndTitle.innerHTML = `<h3><span><a href="http://localhost:4000/${user}">${user}</a>: ${chart.title}</span></h3>`
  
    //Erase all current tiles and replace with selected list
    topWrapper.innerHTML = '';
    for(i = 0; i < viewChart.length; i++){
      if (viewChart[i] !== undefined && viewChart[i] !== null) {
        topWrapper.insertAdjacentHTML('beforeend', `<div style="background-image: url(${viewChart[i].album_image})" class="top" rank=${i} active="no"><p class="frontRank">${i+1}</p><p class="frontPlay">></p></div>`)
      } else {
        topWrapper.insertAdjacentHTML('beforeend', `<div style="background-image: url()" class="top" rank=${i} active="no"><p class="frontRank">${i+1}</p></div>`)
      }
      console.log('in display loop!');
  }
  
    //erase all current chart artist names and replace with selected list
    chartNamesWrapper.innerHTML = ''
    for(i = 0; i < viewChart.length; i++){
    if (viewChart[i] !== null && viewChart[i] !== undefined) {
      chartNamesWrapper.insertAdjacentHTML('beforeend', `<p class="albumInfo" rank=${i}> ${i+1}. ${viewChart[i].artist} - ${viewChart[i].album_name}</p>`)
    } else{
      chartNamesWrapper.insertAdjacentHTML('beforeend', `<p class="albumInfo" rank=${i}> ${i+1}.</p>`)
    }
    }
  
    //add new listeners depending on if the chart selected increased or decreased in tile size
    addtileListeners()
  }

getViewData()
