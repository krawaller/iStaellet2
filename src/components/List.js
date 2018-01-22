import { h, Component } from 'preact';
import { HeartIcon, HeartIconFilled } from './Icons';

export default function List({
  favorites,
  stations,
  stationsByDistance,
  getUrl
}) {
  const listGroups = [
    {
      groupName: 'Favoriter',
      items: stations.filter(({ Name } = {}) => favorites.has(Name))
    },
    {
      groupName: 'Närmaste',
      items: stationsByDistance.slice(0, 3)
    },
    {
      groupName: 'Alla',
      items: stations
    }
  ];

  let set;
  return (
    <div class="list" data-ta-id="list">
      {listGroups.map(
        ({ groupName, items }) =>
          !!items.length && (
            <div class="list-group" data-ta-id={groupName.toLowerCase()}>
              <ul>
                <li class="list-group-title">{groupName}</li>
                {items.map(
                  ({
                    Name,
                    AvailableBikes = 0,
                    AvailableBikeStands = 0
                  } = {}) => (
                    <li>
                      <a
                        href={getUrl('map', { Name })}
                        class="item-link item-content"
                      >
                        <div class="item-inner">
                          <div class="hide-when-empty">
                            {Name && (
                              <div class="row station-row">
                                <div
                                  class="item-title col-55"
                                  data-ta-id="name"
                                >
                                  {Name}
                                </div>
                                <div class="col-15 bikes" data-ta-id="bikes">
                                  {AvailableBikes}
                                </div>
                                <div class="col-15 stands" data-ta-id="stands">
                                  {AvailableBikeStands}
                                </div>
                                <div class="col-15 favorite">
                                  <a
                                    href={getUrl('list', {
                                      favorites: favorites.has(Name)
                                        ? ((set = new Set(favorites)),
                                          set.delete(Name),
                                          set)
                                        : new Set(favorites).add(Name)
                                    })}
                                    data-ta-id="favorite-link"
                                  >
                                    {favorites.has(Name) ? (
                                      <HeartIcon />
                                    ) : (
                                      <HeartIconFilled />
                                    )}
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          )
      )}
    </div>
  );
}
