import { h, Component } from 'preact';
import 'leaflet/dist/leaflet.css';
// Wrap in `window` check to allow pre-rendering
if (typeof window !== 'undefined') {
  var {
    Map,
    TileLayer,
    Icon,
    Marker,
    FeatureGroup,
    Popup,
    LatLng,
    CircleMarker
  } = require('leaflet');
}

export default class MapComponent extends Component {
  constructor(props) {
    super(props);
    this.hasFitInitialBounds = false;
    this.markersByStationId = {};

    this.MyIcon = Icon.extend({
      options: {
        className: 'item',
        html: '<div class="marker"><div class="inner"></div></div>',
        iconSize: [30, 41],
        iconAnchor: [15, 41],
        popupAnchor: [0, -39],
        percentageFull: 0,
        iconUrl: null
      },

      createIcon: function(oldIcon) {
        var div =
            oldIcon && oldIcon.tagName === 'DIV'
              ? oldIcon
              : document.createElement('div'),
          options = this.options;

        div.innerHTML = options.html !== false ? options.html : '';
        div.querySelector('.inner').style.height =
          options.percentageFull * 0.88 + 6 + '%';
        if (options.percentageFull === 100 || options.percentageFull === 0) {
          options.className += ' full';
        } else if (options.percentageFull > 90 || options.percentageFull < 10) {
          options.className += ' warn';
        }

        this._setIconStyles(div, 'icon');
        return div;
      }
    });
  }

  componentDidMount() {
    this.map = new Map(this.base, {
      zoom: 13,
      center: { lat: 57.7088394, lng: 11.974375 }
    });
    this.markerFeatureGroup = new FeatureGroup().addTo(this.map);
    this.starredFeatureGroup = new FeatureGroup().addTo(this.map);
    new TileLayer(
      'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}{r}.png?access_token={accessToken}',
      {
        attribution:
          'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken:
          'pk.eyJ1IjoibGl0ZW5qYWNvYiIsImEiOiJ6TnBCVHNFIn0.ZLiQ7tN-T1Y5Jg3zsUTnqA'
      }
    ).addTo(this.map);

    this.map
      .on(
        'popupopen',
        event => (this.activePopupStationId = event.popup.stationId)
      )
      .on('popupclose', event =>
        setTimeout(() => (this.activePopupStationId = null), 100)
      );

    this.renderMarkers(this.props);
    this.renderLocation(this.props.location);
  }

  componentWillReceiveProps(nextProps) {
    this.renderMarkers({
      ...nextProps,
      targetStationName:
        nextProps.targetStationName !== this.props.targetStationName &&
        nextProps.targetStationName
    });
    this.renderLocation(nextProps.location);
    if (
      nextProps.location &&
      (!this.props.location || nextProps.location.force)
    ) {
      this.map.setView(nextProps.location, 14);
      this.map.fitBounds(
        this.markerFeatureGroup.getBounds().extend(nextProps.location),
        {
          padding: [20, 20],
          maxZoom: 16,
          animate: false
        }
      );
    }
  }

  shouldComponentUpdate() {
    return false;
  }

  renderLocation(location) {
    if (location) {
      if (!this.accuracyMarker) {
        this.accuracyMarker = new CircleMarker(location, location.accuracy, {
          color: '#136AEC',
          fillColor: '#136AEC',
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.5
        }).addTo(this.map);
      }
      this.accuracyMarker.setLatLng(location).setRadius(location.accuracy);

      if (!this.locationMarker) {
        this.locationMarker = new CircleMarker(location, {
          color: '#136AEC',
          fillColor: '#2A93EE',
          fillOpacity: 0.7,
          weight: 2,
          opacity: 0.9,
          radius: 5
        }).addTo(this.map);
      }
      this.locationMarker.setLatLng(location);
    } else this.locationMarker && this.map.removeLayer(this.locationMarker);
  }

  renderMarkers({ favorites, getUrl, stations, targetStationName }) {
    const activePopupStationId = this.activePopupStationId;
    let set;

    stations
      .filter(Boolean)
      .forEach(
        ({
          StationId,
          Name,
          Lat,
          Long,
          AvailableBikeStands = 0,
          AvailableBikes = 0
        } = {}) => {
          let marker;
          if (!(StationId in this.markersByStationId)) {
            marker = new Marker([Lat, Long]).addTo(this.markerFeatureGroup);

            const popup = new Popup();
            popup.stationId = StationId;
            marker.bindPopup(popup);
            this.markersByStationId[StationId] = marker;
          } else marker = this.markersByStationId[StationId];

          const isFavorite = favorites.has(Name);
          marker.addTo(
            isFavorite ? this.starredFeatureGroup : this.markerFeatureGroup
          );
          marker.setOpacity(!isFavorite && favorites.size ? 0.5 : 1);

          const contentElement = document.createElement('div');
          (contentElement.innerHTML = `<a href="${getUrl('map', {
            favorites: favorites.has(Name)
              ? ((set = new Set(favorites)), set.delete(Name), set)
              : new Set(favorites).add(Name)
          })}" data-ta-id="marker-link"><h1>${Name} ${
            favorites.has(Name)
              ? `<svg data-ta-id="heart-icon-filled" width="29" fill="#ff3b30" viewBox="0 0 51 45" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.156 44.736c.102.075.156-.117.156-.117 1.476-1.1 7.757-5.796 9.768-7.637 10.205-9.34 21.444-23.698 11.163-33.17C36.68-5 26.527 4.04 25.156 5.343c-1.37-1.3-11.523-10.34-21.086-1.527-10.28 9.472.957 23.83 11.162 33.17 2.01 1.84 8.293 6.536 9.768 7.634 0 0 .055.19.156.116z" fill-rule="evenodd" />
            </svg>`
              : `<svg data-ta-id="heart-icon" width="29" viewBox="0 0 51 45" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.63 6.063s-10-9-18-3-7 15 0 24 18 16 18 16 11-7 18-16 8-18 0-24-18 3-18 3z" stroke="#8e8e93" stroke-width="2" fill="none" />
            </svg>`
          }</h1></a>
        <span class="bikes">${AvailableBikes ||
          0}</span><span class="stands">${AvailableBikeStands}</span>`),
            marker.getPopup().setContent(contentElement);
          marker.setIcon(
            new this.MyIcon({
              percentageFull:
                AvailableBikes / (AvailableBikes + AvailableBikeStands) * 100
            })
          );
        }
      );

    const targetStation = stations.find(
      ({ Name } = {}) => Name === targetStationName
    );
    if (targetStation) {
      this.map.setView([targetStation.Lat, targetStation.Long], 14);
      this.markersByStationId[targetStation.StationId].openPopup();
    }
    if (!this.hasFitInitialBounds) {
      if (this.fitBounds() !== false) this.hasFitInitialBounds = true;
    }
  }

  fitBounds() {
    const bounds = this.starredFeatureGroup.getBounds().isValid()
      ? this.starredFeatureGroup.getBounds()
      : this.markerFeatureGroup.getBounds().isValid()
        ? this.markerFeatureGroup.getBounds()
        : null;
    if (!bounds) return false;

    this.map.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 16,
      animate: false
    });
  }

  render() {
    return (
      <div class="map-wrapper" data-ta-id="map">
        <div class="map" />
        <svg width="0" height="0">
          <defs>
            <clipPath id="myClip" clipPathUnits="objectBoundingBox">
              <path d="m 0.52 0.000 c 0.271549,0 0.479407,0.146859 0.479407,0.34171 l 0,0.01109 c 0,0.256768 -0.316688,0.57624 -0.487603,0.6468 l -0.0041,0 c -0.170915,-0.07056 -0.50809,-0.390032 -0.50809,-0.6468 l 0,-0.01109 c 0,-0.194851 0.228345,-0.34171 0.499895,-0.34171 0.0027,0 0.01775,0 0.02049,0 z" />
            </clipPath>
          </defs>
        </svg>
      </div>
    );
  }
}
