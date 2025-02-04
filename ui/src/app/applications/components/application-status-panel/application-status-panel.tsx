import {Tooltip} from 'argo-ui';
import * as React from 'react';
import {DataLoader} from '../../../shared/components';
import {Revision} from '../../../shared/components/revision';
import {Timestamp} from '../../../shared/components/timestamp';
import * as models from '../../../shared/models';
import {services} from '../../../shared/services';
import * as utils from '../utils';
import {ApplicationSyncWindowStatusIcon, ComparisonStatusIcon, getAppOperationState, HealthStatusIcon, OperationState, syncStatusMessage} from '../utils';
import {RevisionMetadataPanel} from './revision-metadata-panel';

require('./application-status-panel.scss');

interface Props {
    application: models.Application;
    showOperation?: () => any;
    showConditions?: () => any;
}

export const ApplicationStatusPanel = ({application, showOperation, showConditions}: Props) => {
    const today = new Date();

    let daysSinceLastSynchronized = 0;
    const history = application.status.history || [];
    if (history.length > 0) {
        const deployDate = new Date(history[history.length - 1].deployedAt);
        daysSinceLastSynchronized = Math.round(Math.abs((today.getTime() - deployDate.getTime()) / (24 * 60 * 60 * 1000)));
    }
    const cntByCategory = (application.status.conditions || []).reduce(
        (map, next) => map.set(utils.getConditionCategory(next), (map.get(utils.getConditionCategory(next)) || 0) + 1),
        new Map<string, number>()
    );
    const appOperationState = getAppOperationState(application);
    if (application.metadata.deletionTimestamp) {
        showOperation = null;
    }

    const tooltip = (title: string) => (
        <Tooltip content={title}>
            <span style={{fontSize: 'smaller'}}>
                {' '}
                <i className='fa fa-question-circle help-tip' />
            </span>
        </Tooltip>
    );

    return (
        <div className='application-status-panel row'>
            <div className='application-status-panel__item columns small-2'>
                <div className='application-status-panel__item-value'>
                    <HealthStatusIcon state={application.status.health} />
                    &nbsp;
                    {application.status.health.status}
                    {tooltip('The health status of your app')}
                </div>
                <div className='application-status-panel__item-name'>{application.status.health.message}</div>
            </div>
            <div className='application-status-panel__item columns small-2' style={{position: 'relative'}}>
                <div className='application-status-panel__item-value'>
                    <ComparisonStatusIcon status={application.status.sync.status} />
                    &nbsp;
                    {application.status.sync.status}
                    {tooltip('Whether or not the version of your app is up to date with your repo. You may wish to sync your app if it is out-of-sync.')}
                </div>
                <div className='application-status-panel__item-name'>{syncStatusMessage(application)}</div>
                <div className='application-status-panel__item-name'>
                    {application.status && application.status.sync && application.status.sync.revision && (
                        <RevisionMetadataPanel
                            applicationName={application.metadata.name}
                            source={{...application.spec.source, targetRevision: application.status.sync.revision}}
                        />
                    )}
                </div>
            </div>
            {appOperationState && (
                <div className='application-status-panel__item columns small-4 '>
                    <div className={`application-status-panel__item-value application-status-panel__item-value--${appOperationState.phase}`}>
                        <a onClick={() => showOperation && showOperation()}>
                            <OperationState app={application} />
                        </a>
                        {tooltip(
                            'Whether or not your last app sync was successful. It has been ' +
                                daysSinceLastSynchronized +
                                ' days since last sync. Click for the status of that sync.'
                        )}
                    </div>
                    {appOperationState.syncResult && (
                        <div className='application-status-panel__item-name'>
                            To <Revision repoUrl={application.spec.source.repoURL} revision={appOperationState.syncResult.revision} />
                        </div>
                    )}
                    <div className='application-status-panel__item-name'>
                        {appOperationState.phase} <Timestamp date={appOperationState.finishedAt || appOperationState.startedAt} />
                    </div>
                    {appOperationState.syncResult && (
                        <RevisionMetadataPanel
                            applicationName={application.metadata.name}
                            source={{...application.spec.source, targetRevision: appOperationState.syncResult.revision}}
                        />
                    )}
                </div>
            )}
            {application.status.conditions && (
                <div className={`application-status-panel__item columns small-2`}>
                    <div className='application-status-panel__item-value' onClick={() => showConditions && showConditions()}>
                        {cntByCategory.get('info') && <a className='info'>{cntByCategory.get('info')} Info</a>}
                        {cntByCategory.get('warning') && <a className='warning'>{cntByCategory.get('warning')} Warnings</a>}
                        {cntByCategory.get('error') && <a className='error'>{cntByCategory.get('error')} Errors</a>}
                    </div>
                </div>
            )}
            <DataLoader
                noLoaderOnInputChange={true}
                input={application}
                load={async () => {
                    return await services.applications.getApplicationSyncWindowState(application.metadata.name);
                }}>
                {data => (
                    <React.Fragment>
                        <div className='application-status-panel__item columns small-2' style={{position: 'relative'}}>
                            <div className='application-status-panel__item-value'>
                                {data.assignedWindows && (
                                    <React.Fragment>
                                        <ApplicationSyncWindowStatusIcon project={application.spec.project} state={data} />
                                        {tooltip(
                                            'The aggregate state of sync windows for this app. ' +
                                                'Red: no syncs allowed. ' +
                                                'Yellow: manual syncs allowed. ' +
                                                'Green: all syncs allowed'
                                        )}
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                )}
            </DataLoader>
        </div>
    );
};
