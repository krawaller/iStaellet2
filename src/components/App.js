import { h, Component } from 'preact';
import List from './List';
import Map from 'async!./Map';

import {
  LocateIcon,
  InfoIcon,
  ListIcon,
  ListIconActive,
  MapIcon,
  MapIconActive
} from './Icons';

const R = 6378137;
const PI_360 = Math.PI / 360;

function distance(aLat, aLng, bLat, bLng) {
  const cLat = Math.cos((aLat + bLat) * PI_360);
  const dLat = (bLat - aLat) * PI_360;
  const dLng = (bLng - aLng) * PI_360;

  const f = dLat * dLat + cLat * cLat * dLng * dLng;
  const c = 2 * Math.atan2(Math.sqrt(f), Math.sqrt(1 - f));

  return R * c;
}

export default class App extends Component {
  constructor(props) {
    super(props);
    const url = this.getCurrentUrl();

    this.state = {
      url,
      ...this.getStateUpdateFromUrl(url),
      stations: Array(15).fill(),
      stationsByDistance: []
    };
  }

  componentDidMount() {
    document.documentElement.classList.add(
      `pixel-ratio-${Math.floor(devicePixelRatio || 1)}`
    );

    this.refreshData();
    this.refreshInterval = setInterval(() => this.refreshData(), 30e3);
    this.refreshLocation();

    document.addEventListener('gesturestart', event => event.preventDefault());
    addEventListener('click', this.delegateLinkHandler);
    addEventListener('popstate', this.route.bind(this, undefined, true));
    addEventListener('visibilitychange', this.handleVisibilityChange);
    addEventListener('online', this.refreshData);
  }

  componentWillUnmount() {
    clearInterval(this.refreshInterval);
    removeEventListener('visibilitychange', this.handleVisibilityChange);
    removeEventListener('online', this.refreshData);
  }

  handleVisibilityChange = () => {
    if (!document.hidden) this.refreshData();
  };

  refreshData = () => {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    fetch(
      'https://data.goteborg.se/SelfServiceBicycleService/v1.0/Stations/a8fa9d1b-84f6-440b-a511-f1d906dbe779?format=json'
    )
      .then(response => response.json())
      .then(stations => {
        this.setState({
          stations: stations.sort((a, b) => a.Name.localeCompare(b.Name, 'sv')),
          loaded: true
        });
        this.isRefreshing = false;
      })
      .catch(() => (this.isRefreshing = false));
  };

  getStateUpdateFromUrl(url) {
    return {
      favorites: new Set(
        decodeURIComponent((url.match(/[?&]favoriter=([^&]+)/) || [, ''])[1])
          .split(',')
          .filter(Boolean)
      ),
      ...this.getRoute(url)
    };
  }

  getUrl = (page, { favorites = this.state.favorites, Name } = {}) => {
    return `${
      {
        list: `/`,
        map: `/karta${Name ? `/${encodeURIComponent(Name)}` : ''}`
      }[page]
    }${
      favorites.size
        ? `?favoriter=${Array.from(favorites)
            .map(encodeURIComponent)
            .join(',')}`
        : ''
    }`;
  };

  onScroll = () =>
    this.state.isList && (this.scrollTop = this.listPageContentNode.scrollTop);

  setListPageContentNode = listPageContentNode =>
    (this.listPageContentNode = listPageContentNode);

  refreshLocation(force) {
    let hasUpdated = false;
    navigator.geolocation.clearWatch(this.geolocationWatchId);
    this.fetchLocationPermission().then(
      hasLocationPermission =>
        (hasLocationPermission || force) &&
        (this.geolocationWatchId = navigator.geolocation.watchPosition(
          ({ coords: { latitude: lat, longitude: lng, accuracy } }) => {
            this.setState({
              isLocating: false,
              location: { lat, lng, accuracy, force: !hasUpdated && force },
              stationsByDistance: this.state.stations
                .filter(Boolean)
                .map(
                  station => (
                    (station.d = distance(lat, lng, station.Lat, station.Long)),
                    station
                  )
                )
                .sort((a, b) => a.d - b.d)
            });
            hasUpdated = true;
          },
          console.error,
          {
            maximumAge: 3600 * 1000
          }
        ))
    );
  }

  fetchLocationPermission() {
    return navigator.permissions
      ? navigator.permissions
          .query({ name: 'geolocation' })
          .then(({ state }) => state === 'granted')
      : Promise.resolve(false);
  }

  getCurrentUrl() {
    const { pathname = '/', search = '' } =
      typeof location !== 'undefined' ? location : {};
    return `${pathname}${search}`;
  }

  delegateLinkHandler = event => {
    // ignore events the browser takes care of already:
    const a = event.target.closest('a');
    if (
      !a ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return;
    const href = a.getAttribute('href');
    if (this.getRoute(href)) {
      this.route(href, a.hasAttribute('data-pop'));
      event.preventDefault();
    }
  };

  route(url = this.getCurrentUrl(), popped = false, replace = false) {
    this.setState({ popped, url, ...this.getStateUpdateFromUrl(url) });
    if (!popped)
      history[`${replace ? 'replace' : 'push'}State`](null, null, url);
    this.forceUpdate();
    if (this.state.isList) {
      this.listPageContentNode.scrollTo(0, this.scrollTop);
    }
  }

  getRoute(url = this.getCurrentUrl()) {
    let matches;
    let route = {
      isList: false,
      isMap: false,
      targetStationName: null
    };
    if (/^(\?|\/(\?|$)|\/lista?)/.test(url)) return { ...route, isList: true };
    if ((matches = url.match(/^\/(map|karta)\/?([^\/?]*)/))) {
      return {
        ...route,
        isMap: true,
        hasEverBeenMap: true,
        targetStationName: decodeURIComponent(matches[2])
      };
    }
  }

  locate = () => {
    this.setState({ isLocating: true });
    this.refreshLocation(true);
  };

  render(
    props,
    {
      url,
      isLocating,
      location,
      favorites,
      stations,
      stationsByDistance,
      isList,
      isMap,
      hasEverBeenMap,
      targetStationName,
      loaded
    }
  ) {
    return (
      <div class="view" data-ta-id={loaded ? 'loaded' : 'loading'}>
        <div class="navbar">
          <div class="navbar-inner">
            <div class="left">
              <a
                href="#"
                class="link icon-only"
                onClick={event => {
                  event.preventDefault();
                  if (!isLocating) this.locate();
                }}
              >
                {isLocating ? <span class="preloader" /> : <LocateIcon />}
              </a>
            </div>
            <div class="center title">iStället</div>
            <div class="right">
              <a href="#" class="link icon-only" title="Info">
                <InfoIcon />
              </a>
            </div>
          </div>
        </div>
        <div class="page">
          <div class="page page-current">
            <div class="toolbar tabbar">
              <div class="toolbar-inner">
                <a
                  href={this.getUrl('list')}
                  class={`tab-link ${isList ? 'tab-link-active' : ''}`}
                  data-ta-id="list-link"
                >
                  {isList ? <ListIcon /> : <ListIconActive />}
                </a>
                <a
                  href={this.getUrl('map')}
                  class={`tab-link ${isMap ? 'tab-link-active' : ''}`}
                  data-ta-id="map-link"
                >
                  {isMap ? <MapIcon /> : <MapIconActive />}
                </a>
              </div>
            </div>
            <div class="tabs">
              <div class={`page-content tab ${isMap ? 'tab-active' : ''}`}>
                {hasEverBeenMap && (
                  <Map
                    {...{
                      location,
                      stations,
                      favorites,
                      targetStationName,
                      getUrl: this.getUrl
                    }}
                  />
                )}
              </div>
              <div
                class={`page-content tab ${isList ? 'tab-active' : ''}`}
                onScroll={this.onScroll}
                ref={this.setListPageContentNode}
              >
                {isList && (
                  <List
                    {...{
                      favorites,
                      stations,
                      stationsByDistance,
                      getUrl: this.getUrl
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
