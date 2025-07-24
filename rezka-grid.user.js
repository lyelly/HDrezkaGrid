// ==UserScript==
// @name            HDrezkaGrid - График рейтингов
// @namespace       HDrezkaGrid
// @author          lyelly
// @include         http*://*rezka*/series/*
// @include         http*://hdrezka*/series/*
// @include         http*://rezka*/series/*
// @include         http*://hdrezka.me/series/*
// @include         http*://hdrezka.co/series/*
// @include         http*://rezka.ag/series/*
// @include         http*://rezkify.com/series/*
// @include         http*://rezkery.com/series/*
// @include         http*://*rezka*/cartoons/*
// @include         http*://hdrezka*/cartoons/*
// @include         http*://rezka*/cartoons/*
// @include         http*://hdrezka.me/cartoons/*
// @include         http*://hdrezka.co/cartoons/*
// @include         http*://rezka.ag/cartoons/*
// @include         http*://rezkify.com/cartoons/*
// @include         http*://rezkery.com/cartoons/*
// @grant           GM_xmlhttpRequest
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_getResourceText
// @resource        styles https://raw.githubusercontent.com/lyelly/HDrezkaGrid/refs/heads/main/styles.css
// @resource        icons https://raw.githubusercontent.com/lyelly/HDrezkaGrid/refs/heads/main/icons.js
// @updateURL       https://raw.githubusercontent.com/lyelly/HDrezkaGrid/refs/heads/main/rezka-grid.user.js
// @downloadURL     https://raw.githubusercontent.com/lyelly/HDrezkaGrid/refs/heads/main/rezka-grid.user.js
// @version         1.0.1
// @description     График рейтингов эпизодов для HDrezka (TVmaze/OMDb/Whatson/TMDB/SeriesGraph)
// @run-at          document-end
// ==/UserScript==

(async function () {
  'use strict';

  const isSeriesPage = document.querySelector('#simple-seasons-tabs');

  if (!isSeriesPage) {
    console.log('[Rezka.fi Ratings]: Страница не содержит переключателя сезонов/эпизодов. Скрипт предназначен только для сериалов и не будет запущен.');
    return;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload: res => {
          if (res.status === 200) {
            const script = document.createElement('script');
            script.textContent = res.responseText;
            document.head.appendChild(script);
            resolve();
          } else {
            reject(`Ошибка загрузки ${url}`);
          }
        },
        onerror: () => reject(`Ошибка сети при загрузке ${url}`),
        ontimeout: () => reject(`Таймаут при загрузке ${url}`)
      });
    });
  }

  await loadScript('https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js');

  const myCss = GM_getResourceText("styles");
  GM_addStyle(myCss);

  try {
      const iconsText = GM_getResourceText("icons");
      window.icons = eval(iconsText);
  } catch(e) {
      console.error('[Rezka.fi Ratings] Не удалось загрузить или обработать файл иконок:', e);
      window.icons = {};
  }


  const container = document.createElement('div');
  container.id = 'ratings-graphic-app';

  const socialShareBlock = document.querySelector('.b-post__social_holder_wrapper');
  if (socialShareBlock) {
    socialShareBlock.parentNode.insertBefore(container, socialShareBlock);
  } else {
    const desc = document.querySelector('.b-post__description');
    if (!desc) return;
    desc.parentNode.insertBefore(container, desc.nextSibling);
  }

    const SettingsModal = {
      props: ['show'],
      data() {
        return {
          localSettings: {
            apiSettings: {
              apiSource: GM_getValue('apiSettings.apiSource', 'tvmaze'),
              omdbApiKey: GM_getValue('apiSettings.omdbApiKey', ''),
              tmdbApiKey: GM_getValue('apiSettings.tmdbApiKey', '')
            },
            generalSettings: {
              expandRatingsTableByDefault: GM_getValue('generalSettings.expandRatingsTableByDefault', true)
            }
          },
          omdbApiKeyVisible: false,
          tmdbApiKeyVisible: false,
          icons: window.icons
        };
      },
      methods: {
        saveSettings() {
          for (const groupKey in this.localSettings) {
            for (const settingKey in this.localSettings[groupKey]) {
              const gmKey = `${groupKey}.${settingKey}`;
              GM_setValue(gmKey, this.localSettings[groupKey][settingKey]);
            }
          }
          this.$emit('save');
          this.closeModal();
        },
        closeModal() {
          this.$emit('close');
        },
        toggleOmdbApiKeyVisibility() {
          this.omdbApiKeyVisible = !this.omdbApiKeyVisible;
        },
        toggleTmdbApiKeyVisibility() {
          this.tmdbApiKeyVisible = !this.tmdbApiKeyVisible;
        }
      },
      template: `
        <div v-if="show" class="settings-modal-overlay" @click.self="closeModal">
          <div class="settings-modal-content">
            <div class="modal-header">
              <h3>Настройки</h3>
              <span class="close-icon" @click="closeModal" v-html="icons.close"></span>
            </div>
            <div class="modal-body">
              <h4>Настройки API</h4>
              <div class="setting-group">
                <label for="apiSource">Источник данных для рейтингов:</label>
                <div class="select-with-icon-wrapper">
                  <select id="apiSource" v-model="localSettings.apiSettings.apiSource">
                    <option value="tvmaze">TVmaze</option>
                    <option value="omdb">OMDb</option>
                    <option value="tmdb">TMDB</option>
                    <option value="seriesgraph">SeriesGraph</option>
                    <option value="whatson">Whatson</option>
                  </select>
                  <span class="select-arrow-icon" v-html="icons.chevronDown"></span>
                </div>
              </div>

              <div class="setting-group">
                <label for="omdbApiKey">Ваш API ключ для OMDb:</label>
                <div class="input-with-icon-wrapper">
                  <input :type="omdbApiKeyVisible ? 'text' : 'password'" id="omdbApiKey" v-model="localSettings.apiSettings.omdbApiKey" placeholder="Обязательно для источника OMDb" />
                  <span class="password-toggle-icon" @click="toggleOmdbApiKeyVisibility" v-html="omdbApiKeyVisible ? icons.eye : icons.eyeOff"></span>
                </div>
                <small>Обязательно, если выбран источник OMDb.</small>
              </div>

              <div class="setting-group">
                <label for="tmdbApiKey">Ваш API ключ для TMDB:</label>
                <div class="input-with-icon-wrapper">
                  <input :type="tmdbApiKeyVisible ? 'text' : 'password'" id="tmdbApiKey" v-model="localSettings.apiSettings.tmdbApiKey" placeholder="Введите ваш API ключ TMDB (v3)" />
                  <span class="password-toggle-icon" @click="toggleTmdbApiKeyVisibility" v-html="tmdbApiKeyVisible ? icons.eye : icons.eyeOff"></span>
                </div>
                <small>Обязательно для источников TMDB и SeriesGraph.</small>
              </div>

              <h4>Общие настройки</h4>
              <div class="setting-group">
                <label class="custom-checkbox-container">
                  <input type="checkbox" v-model="localSettings.generalSettings.expandRatingsTableByDefault" />
                  <span class="custom-checkbox"></span>
                  Разворачивать таблицу рейтингов по умолчанию
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button @click="saveSettings">Сохранить</button>
              <button @click="closeModal" class="cancel-button">Отмена</button>
            </div>
          </div>
        </div>
      `
    };

    const InfoModal = {
      props: ['show'],
      data() {
        return {
          icons: window.icons
        };
      },
      methods: {
        closeModal() {
          this.$emit('close');
        }
      },
      template: `
<div v-if="show" class="settings-modal-overlay" @click.self="closeModal">
  <div class="settings-modal-content">
    <div class="modal-header">
      <h3>О скрипте</h3>
      <span class="close-icon" @click="closeModal" v-html="icons.close"></span>
    </div>
    <div class="modal-body">
      <h4>Графика рейтингов эпизодов</h4>
      <p style="font-size: 0.9em; line-height: 1.6; color: var(--rezka-text-color);">
        Этот скрипт добавляет на страницы сериалов на HDrezka интерактивную сетку с рейтингами каждого эпизода.
        Он помогает визуально оценить динамику качества сериала и быстро находить лучшие или худшие серии.
      </p>
      <p style="font-size: 0.9em; line-height: 1.6; color: var(--rezka-text-color);">
        Данные о рейтингах подгружаются нескольких публичных API, который можно выбрать в настройках.
      </p>

      <h4>Источники данных (Data Source)</h4>
      <p style="font-size: 0.9em; line-height: 1.6; color: var(--rezka-text-color);">
        Скрипт использует следующие API для получения информации о рейтингах. Для некоторых из них требуется ваш персональный API ключ.
      </p>
      <div class="provider-logos">
        <div class="provider-logo">
          <div v-html="icons.imdb"></div>
          <span>IMDB</span>
        </div>
        <div class="provider-logo">
          <div v-html="icons.tmdb"></div>
          <span>TMDB</span>
        </div>
      </div>
      
      <div class="modal-credits">
        <span>Made with</span>
        <span v-html="icons.heart"></span>
        <span>by lyelly</span>
        <span class="separator">|</span>
        <a href="https://github.com/lyelly/HDrezkaGrid" target="_blank" rel="noopener noreferrer" class="github-link">
            <span v-html="icons.github"></span>
            <span>GitHub</span>
        </a>
      </div>

    </div>
  </div>
</div>
      `
    };

    const App = {
      components: {
        SettingsModal,
        InfoModal
      },
      data() {
        return {
          isLoading: true,
          error: null,
          episodesBySeason: {},
          hover: null,
          isExpanded: false,
          showSettingsModal: false,
          showInfoModal: false,
          icons: window.icons || {}
        };
      },
      computed: {
        seasons() {
          return Object.keys(this.episodesBySeason).map(Number).sort((a, b) => a - b);
        },
        maxEpisodes() {
          const max = Object.values(this.episodesBySeason).reduce((currentMax, eps) => Math.max(currentMax, eps.length), 0);
          return Array.from({ length: max }, (_, i) => i + 1);
        },
        colorLegend() {
          return {
            'Awesome': { bg: 'var(--rating-awesome-bg)', text: 'var(--rating-awesome-text)', border: 'var(--rating-awesome-border)' },
            'Great': { bg: 'var(--rating-great-bg)', text: 'var(--rating-great-text)', border: 'var(--rating-great-border)' },
            'Good': { bg: 'var(--rating-good-bg)', text: 'var(--rating-good-text)', border: 'var(--rating-good-border)' },
            'Regular': { bg: 'var(--rating-regular-bg)', text: 'var(--rating-regular-text)', border: 'var(--rating-regular-border)' },
            'Bad': { bg: 'var(--rating-bad-bg)', text: 'var(--rating-bad-text)', border: 'var(--rating-bad-border)' },
            'Garbage': { bg: 'var(--rating-garbage-bg)', text: 'var(--rating-garbage-text)', border: 'var(--rating-garbage-border)' },
          };
        },
        gridStyle() {
          const minCellWidth = 50;
          const cellHeight = 38;
          const gridGap = 4;
          const episodeHeaderWidth = 50;

          return {
            '--num-seasons': this.seasons.length,
            '--min-cell-width': `${minCellWidth}px`,
            '--cell-height': `${cellHeight}px`,
            '--grid-gap': `${gridGap}px`,
            '--episode-header-width': `${episodeHeaderWidth}px`,
          };
        }
      },
      methods: {
        getImdbIdFromPage() {
          const el = document.querySelector('.b-post__info_rates.imdb a');
          if (!el) return null;
          const href = el.getAttribute('href');
          const direct = href.match(/tt\d+/);
          if (direct) return direct[0];
          try {
            const pathSegments = href.split('/');
            const encodedSegmentIndex = pathSegments.indexOf('help') + 1;
            const encodedSegment = pathSegments[encodedSegmentIndex];

            if (!encodedSegment) return null;
            const decoded = decodeURIComponent(atob(encodedSegment));
            const match = decoded.match(/tt\d+/);
            return match ? match[0] : null;
          } catch {
            return null;
          }
        },
        async fetchData() {
          const imdbId = this.getImdbIdFromPage();
          if (!imdbId) {
            this.error = 'IMDb ID не найден на странице. Убедитесь, что это страница сериала с рейтингом IMDb.';
            this.isLoading = false;
            return;
          }

          const apiSource = GM_getValue('apiSettings.apiSource', 'tvmaze');

          this.isLoading = true;
          this.error = null;
          this.episodesBySeason = {};

          try {
            if (apiSource === 'tvmaze') {
              await this.fetchDataFromTvmaze(imdbId);
            } else if (apiSource === 'omdb') {
              const omdbApiKey = GM_getValue('apiSettings.omdbApiKey', '');
              if (!omdbApiKey) {
                this.error = 'Для использования OMDb необходимо ввести ваш API ключ в настройках.';
                return;
              }
              await this.fetchDataFromOmdb(imdbId, omdbApiKey);
            } else if (apiSource === 'tmdb') {
              const tmdbApiKey = GM_getValue('apiSettings.tmdbApiKey', '');
              if (!tmdbApiKey) {
                this.error = 'Для использования TMDB API ОБЯЗАТЕЛЬНО необходимо указать ваш персональный API ключ (v3) в настройках скрипта.';
                return;
              }
              await this.fetchDataFromTmdb(imdbId, tmdbApiKey);
            } else if (apiSource === 'whatson') {
              await this.fetchDataFromWhatson(imdbId);
            } else if (apiSource === 'seriesgraph') {
              const tmdbApiKey = GM_getValue('apiSettings.tmdbApiKey', '');
              if (!tmdbApiKey) {
                this.error = 'Для использования SeriesGraph API ОБЯЗАТЕЛЬНО необходимо указать ваш персональный API ключ TMDB (v3) в настройках скрипта.';
                return;
              }
              await this.fetchDataFromSeriesGraph(imdbId, tmdbApiKey);
            }
          } catch (e) {
            this.error = e.message || e.toString();
          } finally {
            this.isLoading = false;
          }
        },
        async fetchDataFromTvmaze(imdbId) {
          let showId;
          try {
            const showResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`,
                onload: r => {
                  if (r.status === 200) {
                    res(JSON.parse(r.responseText));
                  } else {
                    rej(new Error(`Ошибка поиска шоу на TVmaze по IMDb ID (${r.status}): ${r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('Ошибка сети при поиске шоу на TVmaze.')),
                ontimeout: () => rej(new Error('Таймаут при поиске шоу на TVmaze.'))
              });
            });
            if (!showResponse || !showResponse.id) {
              throw new Error('Шоу не найдено на TVmaze. Возможно, нет данных или IMDb ID неверен.');
            }
            showId = showResponse.id;
          } catch (err) {
            throw new Error(`Не удалось получить данные о шоу с TVmaze: ${err.message || err}`);
          }

          try {
            const episodesResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.tvmaze.com/shows/${showId}/episodes`,
                onload: r => {
                  if (r.status === 200) {
                    res(JSON.parse(r.responseText));
                  } else {
                    rej(new Error(`Ошибка получения эпизодов с TVmaze (${r.status}): ${r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('Ошибка сети при получении эпизодов с TVmaze.')),
                ontimeout: () => rej(new Error('Таймаут при получении эпизодов с TVmaze.'))
              });
            });

            const grouped = {};
            episodesResponse.forEach(ep => {
              if (ep.season && ep.number) {
                if (!grouped[ep.season]) {
                  grouped[ep.season] = [];
                }
                grouped[ep.season][ep.number - 1] = ep;
              }
            });
            this.episodesBySeason = grouped;

            if (Object.keys(grouped).length === 0) {
              throw new Error('Данные о рейтингах эпизодов не найдены для этого сериала на TVmaze.');
            }

          } catch (err) {
            throw new Error(`Не удалось получить данные об эпизодах с TVmaze: ${err.message || err}`);
          }
        },
        async fetchDataFromOmdb(imdbId, omdbApiKey) {
          try {
            const initialResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbApiKey}`,
                onload: r => {
                  const data = JSON.parse(r.responseText);
                  if (r.status === 200 && data.Response === "True") {
                    res(data);
                  } else {
                    rej(new Error(`Ошибка OMDb API (общая информация, статус ${r.status}): ${data.Error || r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('Ошибка сети при запросе OMDb API (общая информация).')),
                ontimeout: () => rej(new Error('Таймаут при запросе OMDb API (общая информация).'))
              });
            });

            const totalSeasons = parseInt(initialResponse.totalSeasons, 10);
            if (isNaN(totalSeasons) || totalSeasons === 0) {
              throw new Error('Не удалось определить количество сезонов для сериала на OMDb.');
            }

            const seasonPromises = [];
            for (let s = 1; s <= totalSeasons; s++) {
              seasonPromises.push(new Promise((res, rej) => {
                GM_xmlhttpRequest({
                  method: 'GET',
                  url: `https://www.omdbapi.com/?i=${imdbId}&Season=${s}&apikey=${omdbApiKey}`,
                  onload: r => {
                    const data = JSON.parse(r.responseText);
                    if (r.status === 200 && data.Response === "True") {
                      res(data);
                    } else {
                      rej(new Error(`Ошибка OMDb API для сезона ${s} (статус ${r.status}): ${data.Error || r.responseText}`));
                    }
                  },
                  onerror: () => rej(new Error(`Ошибка сети при запросе OMDb API для сезона ${s}.`)),
                  ontimeout: () => rej(new Error(`Таймаут при запросе OMDb API для сезона ${s}.`))
                });
              }));
            }

            const allSeasonData = await Promise.all(seasonPromises);

            const grouped = {};
            allSeasonData.forEach(seasonData => {
              const seasonNum = parseInt(seasonData.Season, 10);
              if (isNaN(seasonNum) || !seasonData.Episodes) return;

              grouped[seasonNum] = [];
              seasonData.Episodes.forEach(ep => {
                const epNum = parseInt(ep.Episode, 10);
                if (isNaN(epNum) || epNum < 1) return;

                grouped[seasonNum][epNum - 1] = {
                  name: ep.Title,
                  season: seasonNum,
                  number: epNum,
                  rating: {
                    average: ep.imdbRating !== 'N/A' ? parseFloat(ep.imdbRating) : 0
                  },
                  externals: {
                    imdb: ep.imdbID
                  },
                  url: ep.imdbID ? `https://www.imdb.com/title/${ep.imdbID}/` : null
                };
              });
            });
            this.episodesBySeason = grouped;

            if (Object.keys(grouped).length === 0) {
              throw new Error('Данные о рейтингах эпизодов не найдены для этого сериала на OMDb.');
            }

          } catch (err) {
            throw new Error(`Не удалось получить данные с OMDb API: ${err.message || err}`);
          }
        },
        async fetchDataFromTmdb(imdbId, tmdbApiKey) {
          let tmdbShowId;

          try {
            const findResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id`,
                onload: r => {
                  const data = JSON.parse(r.responseText);
                  if (r.status === 200 && data.tv_results && data.tv_results.length > 0) {
                    res(data.tv_results[0]);
                  } else {
                    rej(new Error(`TMDB: Шоу не найдено по IMDb ID (${r.status}): ${r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('TMDB: Ошибка сети при поиске шоу по IMDb ID.')),
                ontimeout: () => rej(new Error('TMDB: Таймаут при поиске шоу по IMDb ID.'))
              });
            });
            tmdbShowId = findResponse.id;
            if (!tmdbShowId) {
              throw new Error('TMDB: Не удалось получить TMDB ID для сериала.');
            }
          } catch (err) {
            throw new Error(`Не удалось получить данные о шоу с TMDB: ${err.message || err}`);
          }

          try {
            const tvDetailsResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.themoviedb.org/3/tv/${tmdbShowId}?api_key=${tmdbApiKey}`,
                onload: r => {
                  const data = JSON.parse(r.responseText);
                  if (r.status === 200 && data.number_of_seasons) {
                    res(data);
                  } else {
                    rej(new Error(`TMDB: Ошибка получения деталей сериала (${r.status}): ${r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('TMDB: Ошибка сети при запросе деталей сериала.')),
                ontimeout: () => rej(new Error('TMDB: Таймаут при запросе деталей сериала.'))
              });
            });
            const totalSeasons = tvDetailsResponse.number_of_seasons;
            if (isNaN(totalSeasons) || totalSeasons === 0) {
              throw new Error('TMDB: Не удалось определить количество сезонов для сериала.');
            }

            const seasonPromises = [];
            for (let s = 1; s <= totalSeasons; s++) {
              seasonPromises.push(new Promise((res, rej) => {
                GM_xmlhttpRequest({
                  method: 'GET',
                  url: `https://api.themoviedb.org/3/tv/${tmdbShowId}/season/${s}?api_key=${tmdbApiKey}`,
                  onload: r => {
                    const data = JSON.parse(r.responseText);
                    if (r.status === 200 && data.episodes) {
                      res(data);
                    } else {
                      rej(new Error(`TMDB: Ошибка получения данных для сезона ${s} (статус ${r.status}): ${r.responseText}`));
                    }
                  },
                  onerror: () => rej(new Error(`TMDB: Ошибка сети при запросе TMDB API для сезона ${s}.`)),
                  ontimeout: () => rej(new Error(`Таймаут при запросе TMDB API для сезона ${s}.`))
                });
              }));
            }

            const allSeasonData = await Promise.all(seasonPromises);

            const grouped = {};
            allSeasonData.forEach(seasonData => {
              const seasonNum = parseInt(seasonData.season_number, 10);
              if (isNaN(seasonNum) || !seasonData.episodes) return;

              grouped[seasonNum] = [];
              seasonData.episodes.forEach(ep => {
                const epNum = parseInt(ep.episode_number, 10);
                if (isNaN(epNum) || epNum < 1) return;

                grouped[seasonNum][epNum - 1] = {
                  name: ep.name,
                  season: seasonNum,
                  number: epNum,
                  rating: {
                    average: ep.vote_average !== undefined ? parseFloat(ep.vote_average) : 0
                  },
                  externals: {
                    imdb: imdbId
                  },
                  url: `https://www.themoviedb.org/tv/${tmdbShowId}/season/${seasonNum}/episode/${epNum}`
                };
              });
            });
            this.episodesBySeason = grouped;

            if (Object.keys(grouped).length === 0) {
              throw new Error('Данные о рейтингах эпизодов не найдены для этого сериала на TMDB.');
            }

          } catch (err) {
            throw new Error(`Не удалось получить данные с TMDB API: ${err.message || err}`);
          }
        },
        async fetchDataFromWhatson(imdbId) {
          try {
            const initialResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://whatson-api.onrender.com/?imdbid=${imdbId}`,
                onload: r => {
                  const data = JSON.parse(r.responseText);
                  if (r.status === 200 && data.results && data.results.length > 0) {
                    res(data.results[0]);
                  } else {
                    rej(new Error(`Ошибка Whatson API (общая информация, статус ${r.status}): ${r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('Ошибка сети при запросе Whatson API (общая информация).')),
                ontimeout: () => rej(new Error('Таймаут при запросе Whatson API (общая информация).'))
              });
            });

            const totalSeasons = parseInt(initialResponse.seasons_number, 10);
            if (isNaN(totalSeasons) || totalSeasons === 0) {
              throw new Error('Не удалось определить количество сезонов для сериала на Whatson API.');
            }

            const seasonPromises = [];
            for (let s = 1; s <= totalSeasons; s++) {
              seasonPromises.push(new Promise((res, rej) => {
                GM_xmlhttpRequest({
                  method: 'GET',
                  url: `https://whatson-api.onrender.com/?imdbid=${imdbId}&append_to_response=episodes_details&filtered_season=${s}`,
                  onload: r => {
                    const data = JSON.parse(r.responseText);
                    if (r.status === 200 && data.results && data.results.length > 0 && data.results[0].episodes_details) {
                      res(data.results[0]);
                    } else {
                      rej(new Error(`Ошибка Whatson API для сезона ${s} (статус ${r.status}): ${r.responseText}`));
                    }
                  },
                  onerror: () => rej(new Error(`Ошибка сети при запросе Whatson API для сезона ${s}.`)),
                  ontimeout: () => rej(new Error(`Таймаут при запросе Whatson API для сезона ${s}.`))
                });
              }));
            }

            const allSeasonData = await Promise.all(seasonPromises);

            const grouped = {};
            allSeasonData.forEach(seasonDetails => {
              const seasonNum = parseInt(seasonDetails.episodes_details[0]?.season, 10);
              if (isNaN(seasonNum) || !seasonDetails.episodes_details) return;

              grouped[seasonNum] = [];
              seasonDetails.episodes_details.forEach(ep => {
                const epNum = parseInt(ep.episode, 10);
                if (isNaN(epNum) || epNum < 1) return;

                grouped[seasonNum][epNum - 1] = {
                  name: ep.title,
                  season: seasonNum,
                  number: epNum,
                  rating: {
                    average: ep.users_rating !== null && ep.users_rating !== undefined ? parseFloat(ep.users_rating) : 0
                  },
                  externals: {
                    imdb: ep.id
                  },
                  url: ep.url
                };
              });
            });
            this.episodesBySeason = grouped;

            if (Object.keys(grouped).length === 0) {
              throw new Error('Данные о рейтингах эпизодов не найдены для этого сериала на Whatson API.');
            }

          } catch (err) {
            throw new Error(`Не удалось получить данные с Whatson API: ${err.message || err}`);
          }
        },
        async fetchDataFromSeriesGraph(imdbId, tmdbApiKey) {
          let tmdbShowId;

          try {
            const findResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id`,
                onload: r => {
                  const data = JSON.parse(r.responseText);
                  if (r.status === 200 && data.tv_results && data.tv_results.length > 0) {
                    res(data.tv_results[0]);
                  } else {
                    rej(new Error(`SeriesGraph (TMDB): Шоу не найдено по IMDb ID (${r.status}): ${r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('SeriesGraph (TMDB): Ошибка сети при поиске шоу по IMDb ID.')),
                ontimeout: () => rej(new Error('SeriesGraph (TMDB): Таймаут при поиске шоу по IMDb ID.'))
              });
            });
            tmdbShowId = findResponse.id;
            if (!tmdbShowId) {
              throw new Error('SeriesGraph (TMDB): Не удалось получить TMDB ID для сериала.');
            }
          } catch (err) {
            throw new Error(`Не удалось получить TMDB ID для SeriesGraph: ${err.message || err}`);
          }

          try {
            const seriesGraphResponse = await new Promise((res, rej) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://seriesgraph.com/api/shows/${tmdbShowId}/season-ratings`,
                onload: r => {
                  const data = JSON.parse(r.responseText);
                  if (r.status === 200) {
                    if (Array.isArray(data) && data.length > 0) {
                      res(data);
                    } else {
                      rej(new Error(`SeriesGraph: Данные о сезонах и эпизодах не найдены (${r.status}): ${r.responseText}`));
                    }
                  } else {
                    rej(new Error(`SeriesGraph: Ошибка получения данных с SeriesGraph (${r.status}): ${r.responseText}`));
                  }
                },
                onerror: () => rej(new Error('SeriesGraph: Ошибка сети при запросе SeriesGraph API.')),
                ontimeout: () => rej(new Error('Таймаут при запросе SeriesGraph API.'))
              });
            });

            const grouped = {};
            seriesGraphResponse.forEach(seasonData => {
              const seasonNum = parseInt(seasonData.episodes[0]?.season_number, 10);
              if (isNaN(seasonNum) || !seasonData.episodes) return;

              grouped[seasonNum] = [];
              seasonData.episodes.forEach(ep => {
                const epNum = parseInt(ep.episode_number, 10);
                if (isNaN(epNum) || epNum < 1) return;

                grouped[seasonNum][epNum - 1] = {
                  name: ep.name,
                  season: seasonNum,
                  number: epNum,
                  rating: {
                    average: ep.vote_average !== undefined ? parseFloat(ep.vote_average) : 0
                  },
                  externals: {
                    imdb: ep.tconst
                  },
                  url: ep.tconst ? `https://www.imdb.com/title/${ep.tconst}/` : null
                };
              });
            });
            this.episodesBySeason = grouped;

            if (Object.keys(grouped).length === 0) {
              throw new Error('Данные о рейтингах эпизодов не найдены для этого сериала на SeriesGraph.');
            }

          } catch (err) {
            throw new Error(`Не удалось получить данные с SeriesGraph API: ${err.message || err}`);
          }
        },
        getRating(s, e) {
          const ep = this.episodesBySeason[s]?.[e - 1];
          if (!ep) {
            return '';
          }
          const r = parseFloat(ep.rating?.average);
          if (isNaN(r) || r === 0) {
            return 'N/A';
          }
          return r.toFixed(1);
        },
        getEpisode(s, e) {
          return this.episodesBySeason[s]?.[e - 1];
        },
        getClass(s, e) {
          const ep = this.episodesBySeason[s]?.[e - 1];

          if (!ep) {
            return 'empty-cell';
          }

          const r = parseFloat(ep.rating?.average);

          if (isNaN(r) || r === 0) {
            return 'missing-data';
          }

          if (r >= 9.0) return 'awesome';
          if (r >= 8.0) return 'great';
          if (r >= 7.0) return 'good';
          if (r >= 6.0) return 'regular';
          if (r >= 4.0) return 'bad';
          return 'garbage';
        },
        openImdbPage(s, e) {
          const episode = this.getEpisode(s, e);
          if (episode && episode.externals && episode.externals.imdb) {
            const imdbUrl = `https://www.imdb.com/title/${episode.externals.imdb}/`;
            window.open(imdbUrl, '_blank');
          } else if (episode && episode.url) {
            window.open(episode.url, '_blank');
          }
        },
        toggleExpansion() {
          this.isExpanded = !this.isExpanded;
        },
        handleSettingsSave() {
          this.isExpanded = GM_getValue('generalSettings.expandRatingsTableByDefault', true);
          this.fetchData();
        }
      },
      async mounted() {
        this.isExpanded = GM_getValue('generalSettings.expandRatingsTableByDefault', true);
        await this.fetchData();
      },
      template: `
        <div class="ratings-wrapper">
          <h2 class="title" @click="toggleExpansion">
            График рейтингов эпизодов
            <span class="toggle-icon" v-html="isExpanded ? icons.chevronUp : icons.chevronDown">
            </span>
            <span class="info-icon" @click.stop="showInfoModal = true" v-html="icons.info">
            </span>
            <span class="settings-icon" @click.stop="showSettingsModal = true" v-html="icons.settings">
            </span>
          </h2>

          <div v-if="isLoading" class="loading">Загрузка данных...</div>
          <div v-else-if="error" class="error">Ошибка: {{ error }}</div>

          <div v-else class="content-container" :class="{ 'collapsed': !isExpanded }">
            <div class="legend">
              <span v-for="(color, label) in colorLegend" :key="label" class="legend-item">
                <span class="legend-circle" :style="{ backgroundColor: color.bg, border: '1px solid ' + color.border }"></span>
                {{ label }}
              </span>
            </div>

            <div class="grid-table" :style="gridStyle">
              <div class="grid-cell corner"></div>

              <div
                v-for="(season, index) in seasons"
                :key="'s-header-' + season"
                class="grid-cell header season-header"
                :style="{ gridColumn: index + 2, gridRow: 1 }"
              >
                S{{ season }}
              </div>

              <template v-for="(ep_num, ep_index) in maxEpisodes" :key="'ep-row-' + ep_num">
                <div
                  class="grid-cell header episode-header"
                  :style="{ gridColumn: 1, gridRow: ep_index + 2 }"
                >
                  E{{ ep_num }}
                </div>

                <div
                  v-for="(season, season_index) in seasons"
                  :key="'cell-' + season + '-' + ep_num"
                  class="grid-cell cell"
                  :class="getClass(season, ep_num)"
                  :style="{ gridColumn: season_index + 2, gridRow: ep_index + 2 }"
                  @mouseenter="hover = {season, ep: ep_num}"
                  @mouseleave="hover = null"
                  @click="getEpisode(season, ep_num) && openImdbPage(season, ep_num)"
                >
                  {{ getRating(season, ep_num) }}
                  <div
                    v-if="hover && hover.season === season && hover.ep === ep_num && getEpisode(season, ep_num)"
                    class="tooltip"
                  >
                    <strong>{{ getEpisode(season, ep_num)?.name || 'Эпизод ' + ep_num }}</strong><br />
                    S{{ season }}E{{ ep_num }} — <b>{{ getRating(season, ep_num) || '—' }}</b>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <SettingsModal
          v-if="showSettingsModal"
          :show="showSettingsModal"
          @close="showSettingsModal = false"
          @save="handleSettingsSave"
        />
        <InfoModal
          v-if="showInfoModal"
          :show="showInfoModal"
          @close="showInfoModal = false"
        />
      `
    };

    Vue.createApp(App).mount('#ratings-graphic-app');
})();
