import React, { createContext, useCallback, useMemo, useState } from 'react';
import type {
  deleteExperimentTagApi,
  getExperimentApi,
  setCompareExperiments,
  setExperimentTagApi,
} from '../../../actions';

import { ErrorWrapper } from '../../../../common/utils/ErrorWrapper';
import RequestStateWrapper from '../../../../common/components/RequestStateWrapper';
import Utils from '../../../../common/utils/Utils';
import { isEqual } from 'lodash';
import { useAsyncDispatch } from '../hooks/useAsyncDispatch';

export interface GetExperimentsContextActions {
  setExperimentTagApi: typeof setExperimentTagApi;
  deleteExperimentTagApi: typeof deleteExperimentTagApi;
  getExperimentApi: typeof getExperimentApi;
  setCompareExperiments: typeof setCompareExperiments;
}

export interface GetExperimentsContextType {
  /**
   * Function used to (re)fetch experiments using their IDs.
   */
  fetchExperiments: (experimentIds: string[]) => void;

  /**
   * Indicates if experiments are being loaded at the moment
   */
  isLoadingExperiment: boolean;

  /**
   * Contains error descriptor if fetching runs failed
   */
  requestError: ErrorWrapper | null;

  /**
   * All experiment-related actions creators
   */
  actions: GetExperimentsContextActions;
}

/**
 * Wrapper context that aggregates concrete redux actions necessary to fetch experiments.
 */
export const GetExperimentsContext = createContext<GetExperimentsContextType | null>(null);

/**
 * Provider component for GetExperimentsContext.
 * Accepts concrete redux actions for searching experiments.
 */
export const GetExperimentsContextProvider = ({
  children,
  actions,
}: React.PropsWithChildren<{
  actions: GetExperimentsContextActions;
}>) => {
  const [fetchExperimentsRequestIds, setFetchExperimentsRequestIds] = useState<string[]>([]);
  const [isLoadingExperiment, setIsLoadingExperiment] = useState(false);

  const [requestError, setRequestError] = useState<any>(null);

  const dispatch = useAsyncDispatch();

  const fetchExperiments = useCallback(
    (experimentIds: string[]) => {
      const fetchFn = () => {
        const newRequestIds = experimentIds.map((experimentId) => {
          const requestAction = actions.getExperimentApi(experimentId);
          dispatch(requestAction).catch((e) => {
            Utils.logErrorAndNotifyUser(e);
          });
          return requestAction.meta.id;
        });
        setFetchExperimentsRequestIds((requestIds) =>
          isEqual(newRequestIds, requestIds) ? requestIds : newRequestIds,
        );
      };

      setRequestError(null);
      fetchFn();
    },
    [actions, dispatch],
  );

  const contextValue = useMemo(
    () => ({
      fetchExperiments,
      isLoadingExperiment,
      requestError: requestError,
      actions,
    }),
    [actions, fetchExperiments, isLoadingExperiment, requestError],
  );

  const renderFn = (_isLoading: false, _renderError: any, requests: any[]) => {
    /**
     * TODO:
     * Defer setting this state because currently it might happen inside
     * RequestStateWrapper's render function which causes React to act up.
     * Either rebuild RequestStateWrapper or introduce some workaround.
     */
    setIsLoadingExperiment(
      requests.some((r) => fetchExperimentsRequestIds.includes(r.id) && r.active),
    );

    if (!requestError) {
      requests.forEach((request) => {
        if (request.error) {
          setRequestError(request.error);
        }
      });
    }

    return children;
  };

  return (
    <GetExperimentsContext.Provider value={contextValue}>
      <RequestStateWrapper
        shouldOptimisticallyRender
        // eslint-disable-next-line no-trailing-spaces
        requestIds={fetchExperimentsRequestIds}
      >
        {renderFn}
      </RequestStateWrapper>
    </GetExperimentsContext.Provider>
  );
};
