import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { switchMap, exhaustMap, map, mergeMap, catchError } from 'rxjs/operators';

import {
  CloseSidenav,
  IncrementLastVMId,
  IncrementLastVMIdError,
  IncrementLastVMIdSuccess,
  LoadUserTags,
  LoadUserTagsError,
  LoadUserTagsSuccess,
  OpenSidenav,
  SetSavePasswordForAllVMs,
  SetSavePasswordForAllVMsError,
  SetSavePasswordForAllVMsSuccess,
  UpdateAskToCreateVM,
  UpdateAskToCreateVMError,
  UpdateAskToCreateVMSuccess,
  UpdateAskToCreateVolume,
  UpdateAskToCreateVolumeError,
  UpdateAskToCreateVolumeSuccess,
  UpdateCustomServiceOfferingParams,
  UpdateFirstDayOfWeek,
  UpdateFirstDayOfWeekError,
  UpdateFirstDayOfWeekSuccess,
  UpdateInterfaceLanguage,
  UpdateInterfaceLanguageError,
  UpdateInterfaceLanguageSuccess,
  UpdateLastVMId,
  UpdateLastVMIdError,
  UpdateLastVMIdSuccess,
  UpdateNavigationOrder,
  UpdateNavigationOrderError,
  UpdateNavigationOrderSuccess,
  UpdateSavePasswordForAllVMs,
  UpdateSavePasswordForAllVMsError,
  UpdateSavePasswordForAllVMsSuccess,
  UpdateSessionTimeout,
  UpdateSessionTimeoutError,
  UpdateSessionTimeoutSuccess,
  UpdateShowSystemTags,
  UpdateShowSystemTagsError,
  UpdateShowSystemTagsSuccess,
  UpdateTheme,
  UpdateThemeError,
  UpdateThemeSuccess,
  UpdateTimeFormat,
  UpdateTimeFormatError,
  UpdateTimeFormatSuccess,
  UserTagsActionTypes
} from './user-tags.actions';
import { TagService } from '../../../shared/services/tags/tag.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ServiceOffering, Tag } from '../../../shared/models';
import { userTagKeys } from '../../../tags/tag-keys';
import { State } from '../../state';
import * as userTagsSelectors from './user-tags.selectors';
import { StartIdleMonitor, UpdateIdleMonitorTimeout } from '../../idle-monitor/idle-monitor.actions';

@Injectable()
export class UserTagsEffects {
  @Effect()
  loadUserTags$: Observable<Action> = this.actions$.pipe(
    ofType<LoadUserTags>(UserTagsActionTypes.LoadUserTags),
    switchMap(() =>
      this.loadTags().pipe(
        map((tags: Tag[]) => new LoadUserTagsSuccess({ tags })),
        catchError(error => of(new LoadUserTagsError({ error })))
      )
    )
  );

  @Effect()
  startIdleMonitor$: Observable<Action> = this.actions$.pipe(
    ofType<LoadUserTagsSuccess>(UserTagsActionTypes.LoadUserTagsSuccess),
    map(() => new StartIdleMonitor())
  );

  @Effect()
  updateAskToCreateVM$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateAskToCreateVM>(UserTagsActionTypes.UpdateAskToCreateVM),
    map(action => `${action.payload.value}`),
    mergeMap((value: string) => {
      const key = userTagKeys.askToCreateVM;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateAskToCreateVMSuccess({ key, value })),
        catchError((error) => of(new UpdateAskToCreateVMError({ error })))
      )
    })
  );

  @Effect()
  updateAskToCreateVolume$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateAskToCreateVolume>(UserTagsActionTypes.UpdateAskToCreateVolume),
    map(action => `${action.payload.value}`),
    mergeMap((value: string) => {
      const key = userTagKeys.askToCreateVolume;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateAskToCreateVolumeSuccess({ key, value })),
        catchError((error) => of(new UpdateAskToCreateVolumeError({ error })))
      )
    })
  );

  @Effect()
  updateSPFAVM$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateSavePasswordForAllVMs>(UserTagsActionTypes.UpdateSPFAVM),
    map(action => `${action.payload.value}`),
    mergeMap((value: string) => {
      const key = userTagKeys.savePasswordForAllVMs;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateSavePasswordForAllVMsSuccess({ key, value })),
        catchError((error) => of(new UpdateSavePasswordForAllVMsError({ error })))
      )
    })
  );

  @Effect()
  updateFirstDayOfWeek$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateFirstDayOfWeek>(UserTagsActionTypes.UpdateFirstDayOfWeek),
    map(action => `${action.payload.value}`),
    mergeMap((value: string) => {
      const key = userTagKeys.firstDayOfWeek;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateFirstDayOfWeekSuccess({ key, value })),
        catchError((error) => of(new UpdateFirstDayOfWeekError({ error })))
      )
    })
  );

  @Effect()
  updateInterfaceLanguage$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateInterfaceLanguage>(UserTagsActionTypes.UpdateInterfaceLanguage),
    map(action => action.payload.value),
    mergeMap((value: string) => {
      const key = userTagKeys.lang;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateInterfaceLanguageSuccess({ key, value })),
        catchError((error) => of(new UpdateInterfaceLanguageError({ error })))
      )
    })
  );

  @Effect()
  updateLastVmId$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateLastVMId>(UserTagsActionTypes.UpdateLastVMId),
    map(action => `${action.payload.value}`),
    mergeMap((value: string) => {
      const key = userTagKeys.lastVMId;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateLastVMIdSuccess({ key, value })),
        catchError((error) => of(new UpdateLastVMIdError({ error })))
      )
    })
  );

  @Effect()
  updateSessionTimeout$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateSessionTimeout>(UserTagsActionTypes.UpdateSessionTimeout),
    map(action => `${action.payload.value}`),
    mergeMap((value: string) => {
      const key = userTagKeys.sessionTimeout;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateSessionTimeoutSuccess({ key, value })),
        catchError((error) => of(new UpdateSessionTimeoutError({ error })))
      )
    })
  );

  @Effect()
  updateIdleMonitor$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateSessionTimeoutSuccess>(UserTagsActionTypes.UpdateSessionTimeoutSuccess),
    map(action => new UpdateIdleMonitorTimeout({ timeout: +action.payload.value }))
  );

  @Effect()
  updateShowSystemTags$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateShowSystemTags>(UserTagsActionTypes.UpdateShowSystemTags),
    map(action => `${action.payload.value}`),
    mergeMap((value: string) => {
      const key = userTagKeys.showSystemTags;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateShowSystemTagsSuccess({ key, value })),
        catchError((error) => of(new UpdateShowSystemTagsError({ error })))
      )
    })
  );

  @Effect()
  updateTimeFormat$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateTimeFormat>(UserTagsActionTypes.UpdateTimeFormat),
    map(action => action.payload.value),
    mergeMap((value: string) => {
      const key = userTagKeys.timeFormat;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateTimeFormatSuccess({ key, value })),
        catchError((error) => of(new UpdateTimeFormatError({ error })))
      )
    })
  );

  @Effect()
  updateTheme$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateTheme>(UserTagsActionTypes.UpdateTheme),
    map(action => action.payload.value),
    mergeMap((value: string) => {
      const key = userTagKeys.theme;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateThemeSuccess({ key, value })),
        catchError((error) => of(new UpdateThemeError({ error })))
      )
    })
  );

  @Effect()
  updateNavigationOrder$: Observable<Action> = this.actions$.pipe(
    ofType<UpdateNavigationOrder>(UserTagsActionTypes.UpdateNavigationOrder),
    map(action => action.payload.value),
    mergeMap((value: string) => {
      const key = userTagKeys.navigationOrder;
      return this.upsertTag(key, value).pipe(
        map(() => new UpdateNavigationOrderSuccess({ key, value })),
        catchError((error) => of(new UpdateNavigationOrderError({ error })))
      )
    })
  );

  @Effect()
  setSavePasswordForAllVms$: Observable<Action> = this.actions$.pipe(
    ofType<SetSavePasswordForAllVMs>(UserTagsActionTypes.SetSPFAVM),
    map(action => `${action.payload.value}`),
    exhaustMap((value: string) => {
        const key = userTagKeys.savePasswordForAllVMs;
        return this.createTag(key, value).pipe(
          map(() => new SetSavePasswordForAllVMsSuccess({ key, value })),
          catchError((error) => of(new SetSavePasswordForAllVMsError({ error })))
        )
      }
    )
  );

  @Effect()
  incrementLastVMId$: Observable<Action> = this.actions$.pipe(
    ofType<IncrementLastVMId>(UserTagsActionTypes.IncrementLastVMId),
    mergeMap(() => this.store.select(userTagsSelectors.getLastVMId).first()),
    mergeMap(id => {
      const key = userTagKeys.lastVMId;
      const value = `${id + 1}`;
      return this.upsertTag(key, value).pipe(
        map(() => new IncrementLastVMIdSuccess({ key, value })),
        catchError((error) => of(new IncrementLastVMIdError({ error })))
      )
    })
  );

  // We omit the result of setting the value on the server, because we have already changed the value in the store
  // This is required so that the UI reacts instantly and does not wait until an answer comes from the server.
  // Downsides: if the tag is not set, the user selected state will not be saved
  @Effect({ dispatch: false })
  openSidenav$: Observable<Action> = this.actions$.pipe(
    ofType<OpenSidenav>(UserTagsActionTypes.OpenSidenav),
    mergeMap(() => this.upsertTag(userTagKeys.sidenavVisible, 'true'))
  );

  @Effect({ dispatch: false })
  closeSidenav$: Observable<Action> = this.actions$.pipe(
    ofType<CloseSidenav>(UserTagsActionTypes.CloseSidenav),
    mergeMap(() => this.upsertTag(userTagKeys.sidenavVisible, 'false'))
  );

  @Effect({ dispatch: false })
  updateCustomServiceOfferingParams$: Observable<any> = this.actions$.pipe(
    ofType<UpdateCustomServiceOfferingParams>(UserTagsActionTypes.UpdateCustomServiceOfferingParams),
    mergeMap((action) => this.setComputeOfferingParams(action.payload.offering))
  );

  private readonly resourceType = 'User';

  private get resourceId(): string | null {
    return this.authService.user.userid;
  }

  constructor(
    private actions$: Actions,
    private tagService: TagService,
    private authService: AuthService,
    private store: Store<State>
  ) {
  }

  private setComputeOfferingParams(offering: ServiceOffering) {
    const cpuNumberKey = `${userTagKeys.computeOfferingParam}.${offering.id}.cpunumber`;
    const cpuSpeedKey = `${userTagKeys.computeOfferingParam}.${offering.id}.cpuspeed`;
    const memoryKey = `${userTagKeys.computeOfferingParam}.${offering.id}.memory`;

    return Observable.forkJoin(
      this.upsertTag(cpuNumberKey, offering.cpunumber && offering.cpunumber.toString()),
      this.upsertTag(cpuSpeedKey, offering.cpuspeed && offering.cpuspeed.toString()),
      this.upsertTag(memoryKey, offering.memory && offering.memory.toString()),
    );
  }

  private loadTags() {
    return this.tagService.getList({
      resourceid: this.resourceId
    });
  }

  private upsertTag(key: string, value: string) {
    return this.deleteTag(key).pipe(
      switchMap(() => this.createTag(key, value)),
      catchError(() => this.createTag(key, value))
    )
  }

  private deleteTag(key: string) {
    return this.tagService.remove({
      resourceids: this.resourceId,
      resourcetype: this.resourceType,
      'tags[0].key': key
    })
  }

  private createTag(key: string, value: string) {
    return this.tagService.create({
      resourceids: this.resourceId,
      resourcetype: this.resourceType,
      'tags[0].key': key,
      'tags[0].value': value
    })
  }
}
