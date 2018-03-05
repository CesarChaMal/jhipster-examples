import * as SockJS from 'sockjs-client';
import * as Stomp from 'webstomp-client';
import { Observable, Observer } from 'rxjs';
import { Storage } from 'react-jhipster';
import { ACTION_TYPES } from 'app/modules/administration/administration.reducer';

let stompClient = null;

let subscriber = null;
let connection: Promise<any>;
let connectedPromise: any = null;
let listener: Observable<any>;
let listenerObserver: Observer<any>;
let alreadyConnectedOnce = false;

const connect = () => {
  if (connectedPromise !== null || alreadyConnectedOnce) {
    // the connection is already being established
    return;
  }
  connection = createConnection();
  listener = createListener();

  // building absolute path so that websocket doesn't fail when deploying with a context path
  const loc = window.location;
  let url = '//' + loc.host + loc.pathname + 'websocket/tracker';
  const authToken = Storage.local.get('jhi-authenticationToken') || Storage.session.get('jhi-authenticationToken');
  if (authToken) {
    url += '?access_token=' + authToken;
  }
  const socket = new SockJS(url);
  stompClient = Stomp.over(socket);
  const headers = {};
  stompClient.connect(headers, () => {
    connectedPromise('success');
    connectedPromise = null;
    subscribe();
    sendActivity();
    if (!alreadyConnectedOnce) {
      window.onhashchange = () => {
        sendActivity();
      };
      alreadyConnectedOnce = true;
    }
  });
};

const disconnect = () => {
  if (stompClient !== null) {
    stompClient.disconnect();
    stompClient = null;
  }
  window.onhashchange = () => {};
  alreadyConnectedOnce = false;
};

const receive = () => listener;

const sendActivity = () => {
  connection.then(() => {
    stompClient.send(
      '/topic/activity', // destination
      JSON.stringify({ page: window.location.hash }), // body
      {} // header
    );
  });
};

const subscribe = () => {
  connection.then(() => {
    subscriber = stompClient.subscribe('/topic/tracker', data => {
      listenerObserver.next(JSON.parse(data.body));
    });
  });
};

const unsubscribe = () => {
  if (subscriber !== null) {
    subscriber.unsubscribe();
  }
  listener = createListener();
};

const createListener = (): Observable<any> =>
  new Observable(observer => {
    listenerObserver = observer;
  });

const createConnection = (): Promise<any> => new Promise((resolve, reject) => (connectedPromise = resolve));

export default store => next => action => {
  if (action.type === 'authentication/GET_SESSION_FULFILLED') {
    connect();
    if (!alreadyConnectedOnce) {
      receive().subscribe(activity => {
        return store.dispatch({
          type: ACTION_TYPES.WEBSOCKET_MESSAGE,
          payload: activity
        });
      });
    }
  } else if (action.type === 'authentication/GET_SESSION_REJECTED') {
    disconnect();
  }
  return next(action);
};
