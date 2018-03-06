import { expect } from 'chai';
import { REQUEST, FAILURE, SUCCESS } from 'app/shared/reducers/action-type.util';

import administration, {ACTION_TYPES, gatewayRoutes} from 'app/modules/administration/administration.reducer';

describe('User managment reducer tests', () => {
  function isEmpty(element): boolean {
    if (element instanceof Array) {
      return element.length === 0;
    } else {
      return Object.keys(element).length === 0;
    }
  }

  function testInitialState(state) {
    expect(state).to.contain({
      loading: false,
      errorMessage: null,
      totalItems: 0
    });
    expect(isEmpty(state.gateway.routes));
    expect(isEmpty(state.logs.loggers));
    expect(isEmpty(state.threadDump));
    expect(isEmpty(state.audits));
    expect(isEmpty(state.tracker.activities));
  }

  function testMultipleTypes(types, payload, testFunction) {
    types.forEach(e => {
      testFunction(administration(undefined, { type: e, payload }));
    });
  }

  describe('Common', () => {
    it('should return the initial state', () => {
      testInitialState(administration(undefined, {}));
    });
  });

  describe('Requests', () => {
      it('should set state to loading', () => {
        testMultipleTypes(
          [
            REQUEST(ACTION_TYPES.FETCH_GATEWAY_ROUTE),
            REQUEST(ACTION_TYPES.FETCH_LOGS),
            REQUEST(ACTION_TYPES.FETCH_HEALTH),
            REQUEST(ACTION_TYPES.FETCH_METRICS),
            REQUEST(ACTION_TYPES.FETCH_THREAD_DUMP),
            REQUEST(ACTION_TYPES.FETCH_CONFIGURATIONS),
            REQUEST(ACTION_TYPES.FETCH_ENV),
            REQUEST(ACTION_TYPES.FETCH_AUDITS)
          ],
          {},
          state => {
            expect(state).to.contain({
              errorMessage: null,
              loading: true
            });
          });
      });
  });

  describe('Failures', () => {
    it('should set state to failed and put an error message in errorMessage', () => {
      testMultipleTypes(
        [
          FAILURE(ACTION_TYPES.FETCH_GATEWAY_ROUTE),
          FAILURE(ACTION_TYPES.FETCH_LOGS),
          FAILURE(ACTION_TYPES.FETCH_HEALTH),
          FAILURE(ACTION_TYPES.FETCH_METRICS),
          FAILURE(ACTION_TYPES.FETCH_THREAD_DUMP),
          FAILURE(ACTION_TYPES.FETCH_CONFIGURATIONS),
          FAILURE(ACTION_TYPES.FETCH_ENV),
          FAILURE(ACTION_TYPES.FETCH_AUDITS)
        ],
        'something happened',
        state => {
          expect(state).to.contain({
            loading: false,
            errorMessage: 'something happened'
          });
        }
      );
    });
  });

  describe('Success', () => {
    it('should update state according to a successful fetch gateway routes request', () => {
      const payload = { data: [] };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_GATEWAY_ROUTE), payload });

      expect(toTest).to.deep.include({
        loading: false,
        gateway: { routes: payload.data }
      });
    });

    it('should update state according to a successful fetch logs request', () => {
      const payload = { data: [{ 'name' : 'ROOT', 'level' : 'DEBUG' }] };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_LOGS), payload });

      expect(toTest).to.deep.include({
        loading: false,
        logs: { loggers: payload.data }
      });
    });

    it('should update state according to a successful fetch health request', () => {
      const payload = { data: { 'status' : 'UP' } };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_HEALTH), payload });

      expect(toTest).to.deep.include({
        loading: false,
        health: payload.data
      });
    });

    it('should update state according to a successful fetch metrics request', () => {
      const payload = { data: { 'version': '3.1.3', 'gauges': {} } };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_METRICS), payload });

      expect(toTest).to.deep.include({
        loading: false,
        metrics: payload.data
      });
    });

    it('should update state according to a successful fetch thread dump request', () => {
      const payload = { data: [{ 'threadName': 'hz.gateway.cached.thread-6', 'threadId': 9266 }] };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_THREAD_DUMP), payload });

      expect(toTest).to.deep.include({
        loading: false,
        threadDump: payload.data
      });
    });

    it('should update state according to a successful fetch configurations request', () => {
      const payload = { data: { 'contexts' : { 'jhipster' : { 'beans' : {} } } } };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_CONFIGURATIONS), payload });

      expect(toTest).to.deep.include({
        loading: false,
        configuration: {
          configProps: payload.data,
          env: {}
        }
      });
    });

    it('should update state according to a successful fetch env request', () => {
      const payload = { data: { activeProfiles : [ 'swagger', 'dev' ] } };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_ENV), payload });

      expect(toTest).to.deep.include({
        loading: false,
        configuration: {
          configProps: {},
          env: payload.data
        }
      });
    });

    it('should update state according to a successful fetch audits request', () => {
      const headers = { ['x-total-count']: 1 };
      const payload = { data: [{ id: 1, userLogin: 'admin' }], headers };
      const toTest = administration(undefined, { type: SUCCESS(ACTION_TYPES.FETCH_AUDITS), payload });

      expect(toTest).to.contain({
        loading: false,
        audits: payload.data,
        totalItems: headers['x-total-count']
      });
    });
  });

  describe('Websocket Message Handling', () => {
    it('should update state according to a successful websocket message receipt', () => {
      const payload = { id: 1, userLogin: 'admin', page: 'home', sessionId: 'abc123' };
      const toTest = administration(undefined, { type: ACTION_TYPES.WEBSOCKET_MESSAGE, payload });

      expect(toTest).to.deep.include({
        tracker: { activities: [ payload ] }
      });
    });

    it('should update state according to a successful websocket message receipt - only one activity per session', () => {
      const firstPayload = { id: 1, userLogin: 'admin', page: 'home', sessionId: 'abc123' };
      const secondPayload = { id: 1, userLogin: 'admin', page: 'user-management', sessionId: 'abc123' };
      const firstState = administration(undefined, { type: ACTION_TYPES.WEBSOCKET_MESSAGE, payload: firstPayload });
      const secondState = administration(firstState, { type: ACTION_TYPES.WEBSOCKET_MESSAGE, payload: secondPayload });

      expect(secondState).to.deep.include({
        tracker: { activities: [ secondPayload ] }
      });
    });

    it('should update state according to a successful websocket message receipt - remove logged out sessions', () => {
      const firstPayload = { id: 1, userLogin: 'admin', page: 'home', sessionId: 'abc123' };
      const secondPayload = { id: 1, userLogin: 'admin', page: 'logout', sessionId: 'abc123' };
      const firstState = administration(undefined, { type: ACTION_TYPES.WEBSOCKET_MESSAGE, payload: firstPayload });
      const secondState = administration(firstState, { type: ACTION_TYPES.WEBSOCKET_MESSAGE, payload: secondPayload });

      expect(secondState).to.deep.include({
        tracker: { activities: [ ] }
      });
    });
  });
});
