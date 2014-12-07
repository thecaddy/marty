var _ = require('../utils/tinydash');
var Diagnostics = require('../diagnostics');
var reservedKeys = ['listenTo', 'getState'];
var cloneState = require('../utils/cloneState');

function StateMixin(options) {
  var config, listeners, lastState;

  var listenToActions = shouldListenToActions(options);

  if (!options) {
    throw new Error('The state mixin is expecting some options');
  }

  if (isStore(options)) {
    config = storeMixinConfig(options);
  } else {
    config = simpleMixinConfig(options);
  }

  var mixin = {
    onStoreChanged: function (state, store) {
      this.setState(this.tryGetState(store));
    },
    onActionChanged: function (state, store, actionToken) {
      var nextState = this.tryGetState(store);

      if (!nextState) {
        return;
      }

      if (isActionThatChanged(nextState) || _.any(_.map(nextState, isActionThatChanged))) {
        this.setState(nextState);
      }

      function isActionThatChanged(action) {
        return action && action.token === actionToken;
      }
    },
    tryGetState: function (store) {
      var handler;

      if (Diagnostics.enabled && store && store.action) {
        handler = store.action.addViewHandler(options.name, this, lastState);
      }

      try {
        return this.getState();
      } catch (e) {
        if (handler) {
          handler.failed(e);
        }

        return {};
      } finally {
        if (handler) {
          handler.dispose();
          lastState = cloneState(this.state);
        }
      }
    },
    componentDidMount: function () {
      var ActionsStore = require('../stores/actionsStore');

      listeners = _.map(config.stores, function (store) {
        return store.addChangeListener(this.onStoreChanged);
      }, this);

      if (listenToActions) {
        listeners.push(
          ActionsStore.addChangeListener(this.onActionChanged)
        );
      }
    },
    componentWillReceiveProps: function (nextProps) {
      var oldProps = this.props;
      this.props = nextProps;

      var newState = this.getState();

      this.props = oldProps;
      this.setState(newState);
    },
    componentWillUnmount: function () {
      _.each(listeners, function (listener) {
        listener.dispose();
      });
    },
    getState: function () {
      return config.getState(this);
    },
    getInitialState: function () {
      var initialState = {};

      if (options.getInitialState) {
        initialState = options.getInitialState();
      }

      var state = _.extend({}, initialState, this.getState());

      if (Diagnostics.enabled) {
        lastState = cloneState(state);
      }

      return state;
    }
  };

  return mixin;

  function storeMixinConfig(store) {
    return {
      stores: [store],
      getState: function () {
        return store.getState();
      }
    };
  }

  function simpleMixinConfig(options) {
    var stores = (options.listenTo || []);
    var storesToGetStateFrom = findStoresToGetStateFrom(options);

    if (!_.isArray(stores)) {
      stores = [stores];
    }

    if (!areStores(stores)) {
      throw new Error('Can only listen to stores');
    }

    stores = stores.concat(_.values(storesToGetStateFrom));

    return {
      stores: stores,
      getState: getState
    };

    function getState(view) {
      var state = _.object(_.map(storesToGetStateFrom, getStateFromStore));

      if (options.getState) {
        state = _.extend(state, options.getState.call(view));
      }

      return state;

      function getStateFromStore(store, name) {
        return [name, store.getState()];
      }
    }

    function findStoresToGetStateFrom(options) {
      var storesToGetStateFrom = {};
      _.each(options, function (value, key) {
        if (reservedKeys.indexOf(key) === -1 && isStore(value)) {
          storesToGetStateFrom[key] = value;
        }
      });

      return storesToGetStateFrom;
    }
  }

  function shouldListenToActions(options) {
    return _.isUndefined(options.listenToActions) || !!options.listenToActions;
  }

  function areStores(stores) {
    for (var i = stores.length - 1; i >= 0; i--) {
      if (!isStore(stores[i])) {
        return false;
      }
    }
    return true;
  }

  function isStore(store) {
    return store.getState && store.addChangeListener;
  }
}

module.exports = StateMixin;