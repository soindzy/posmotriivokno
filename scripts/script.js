
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;


const cardsContainer = document.querySelector('.list');
const videoContainer = document.querySelector('.result__video-container');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('form');


const cardTmp = document.querySelector('.cards-list-item-template');
const preloaderTmp = document.querySelector('.preloader-template');
const videoNotFoundTmp = document.querySelector('.errorstemplate');
const moreButtonTmp = document.querySelector('.more-button-template');


let cardsOnPageState = [];


showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsContainer);
mainMechanics(endpoint);


form.onsubmit = (e) => {
  e.preventDefault();
  cardsContainer.textContent = '';
  [...videoContainer.children].forEach((el) => {
    el.className === 'errors' && el.remove();
  });
  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);
  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(
    endpoint,
    formData.city,
    formData.timeArray
  );
  mainMechanics(requestUrl);
};



async function mainMechanics(endpoint) {
  try {
    const data = await (await fetch(endpoint)).json();
    cardsOnPageState = data.results;

    if (!data?.results?.[0]) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsContainer,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });
    document
      .querySelectorAll('.cardlink')[0]
      .classList.add('cardlinkcurrent');
    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
    chooseCurrentVideo({
      baseUrl: BASE_URL,
      videoData: cardsOnPageState,
      cardLinksSelector: '.cardlink',
      currentLinkClassName: '.cardlinkcurrent',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate: moreButtonTmp,
      cardsContainer,
      buttonSelector: '.more-button',
      initialEndpoint: endpoint,
      baseUrl: BASE_URL,
      cardTmp: cardTmp,
    });
  } catch (err) {
    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'Нет подходящих видео =(');
    } else {
      showError(videoContainer, videoNotFoundTmp, 'Ошибка получения данных :(');
    }
    console.log(err);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
  }
}


async function delay(ms) {
  return await new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
}


async function waitForReadyVideo(video) {
  return await new Promise((resolve) => {
    video.oncanplaythrough = resolve;
  });
}


function showPreloader(tmp, parent) {
  const node = tmp.content.cloneNode(true);
  parent.append(node);
  console.log('показал прелоадер');
}


function removePreloader(parent, preloaderSelector) {
  const preloader = parent.querySelector(preloaderSelector);
  if (preloader) {
    preloader.remove();
  }

  console.log('убрал прелоадер');
}


function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);
    node.querySelector('a').setAttribute('id', el.id);
    node.querySelector('.videocardtitle').textContent = el.city;
    node.querySelector('.videocarddescription').textContent =
      el.description;
    node
      .querySelector('.videocardthumbnail')
      .setAttribute('src', `${baseUrl}${el.thumbnail.url}`);
    node
      .querySelector('.videocardthumbnail')
      .setAttribute('alt', el.description);
    container.append(node);
  });
  console.log('Сгенерировал карточки');
}


function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.setAttribute('src', `${baseUrl}${videoUrl}`);
  video.setAttribute('poster', `${baseUrl}${posterUrl}`);
  console.log('Подставил видео в основной блок');
}


function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]');
  const checkboxes = form.querySelectorAll('input[name="time"]');
  const checkedValuesArray = [...checkboxes].reduce((acc, item) => {
    item.checked && acc.push(item.value);
    return acc;
  }, []);
  console.log('Собрал данные формы в объект');
  return {
    city: city.value,
    timeArray: checkedValuesArray,
  };
}


function generateFilterRequest(endpoint, city, timeArray) {
  if (city) {
    endpoint += `filters[city][$containsi]=${city}&`;
  }
  if (timeArray) {
    timeArray.forEach((timeslot) => {
      endpoint += `filters[time_of_day][$eqi]=${timeslot}&`;
    });
  }
  console.log('Сгенерировал строку адреса запроса в API из данных формы');
  return endpoint;
}


function chooseCurrentVideo({
  baseUrl,
  videoData,
  cardLinksSelector,
  currentLinkClassName,
  mainVideo,
}) {
  const cardsList = document.querySelectorAll(cardLinksSelector);
  if (cardsList) {
    cardsList.forEach((item) => {
      item.onclick = async (e) => {
        e.preventDefault();
        cardsList.forEach((item) => {
          item.classList.remove(currentLinkClassName);
        });
        item.classList.add(currentLinkClassName);
        showPreloader(preloaderTmp, videoContainer);
        const vidoObj = videoData.find(
          (video) => String(video.id) === String(item.id)
        );
        setVideo({
          baseUrl,
          video: mainVideo,
          videoUrl: vidoObj.video.url,
          posterUrl: vidoObj.poster.url,
        });
        await waitForReadyVideo(mainVideo);
        await delay(preloaderWaitindTime);
        removePreloader(videoContainer, '.preloader');
        console.log('Переключил видео');
      };
    });
  }
}

function showError(container, errorTemplate, errorMessage) {
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.errorstitle').textContent = errorMessage;
  container.append(node);
  console.log('показал, ошибку');
}


function showMoreCards({
  dataArray,
  buttonTemplate,
  cardsContainer,
  buttonSelector,
  initialEndpoint,
  baseUrl,
  cardTmp,
}) {
  if (dataArray.pagination.page === dataArray.pagination.pageCount) return;

  const button = buttonTemplate.content.cloneNode(true);
  cardsContainer.append(button);

  const buttonInDOM = cardsContainer.querySelector(buttonSelector);
  buttonInDOM.addEventListener('click', async () => {

    let currentPage = dataArray.pagination.page;
    let urlToFetch = `${initialEndpoint}pagination[page]=${(currentPage += 1)}&`;
    try {
      let data = await (await fetch(urlToFetch)).json();
      buttonInDOM.remove();
      cardsOnPageState = cardsOnPageState.concat(data.results);
      appendCards({
        baseUrl,
        dataArray: data.results,
        cardTmp,
        container: cardsContainer,
      });
      chooseCurrentVideo({
        baseUrl: BASE_URL,
        videoData: cardsOnPageState,
        cardLinksSelector: '.cardlink',
        currentLinkClassName: '.cardlinkcurrent',
        mainVideo: videoElement,
      });
      showMoreCards({
        dataArray: data,
        buttonTemplate,
        cardsContainer,
        buttonSelector,
        initialEndpoint,
        baseUrl,
        cardTmp,
      });
    } catch (err) {
      return err;
    }
  });
}
