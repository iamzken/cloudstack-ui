import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { MdlDialogReference } from '../../dialog/dialog-module';
import { DialogService } from '../../dialog/dialog-module/dialog.service';

import {
  AffinityGroupService,
  DiskOffering,
  GROUP_POSTFIX,
  InstanceGroupService,
  JobsNotificationService,
  SecurityGroupService,
  ZoneService
} from '../../shared';

import { ServiceOffering, Zone } from '../../shared/models';
import { ResourceUsageService } from '../../shared/services/resource-usage.service';
import { UtilsService } from '../../shared/services/utils.service';
import { Template } from '../../template/shared';

import { VmService } from '../shared/vm.service';
import { VmCreationState } from './vm-creation-data/vm-creation-state';
import { BaseField } from './vm-creation-field/base-field';
import { VmFormService } from './vm-form.service';
import { Rules } from '../../security-group/sg-creation/sg-creation.component';
import { VmCreationService } from './vm-creation.service';
import { VmCreationData } from './vm-creation-data/vm-creation-data';


@Component({
  selector: 'cs-vm-create',
  templateUrl: 'vm-creation.component.html',
  styleUrls: ['vm-creation.component.scss']
})
export class VmCreationComponent implements OnInit {
  public vmCreationData: VmCreationData;
  public vmCreationState: VmCreationState;

  public fetching: boolean;
  public enoughResources: boolean;
  public insufficientResources: Array<string> = [];
  public insufficientResourcesErrorMap = {
    instances: 'VM_CREATION_FORM.RESOURCES.INSTANCES',
    ips: 'VM_CREATION_FORM.RESOURCES.IPS',
    volumes: 'VM_CREATION_FORM.RESOURCES.VOLUMES',
    cpus: 'VM_CREATION_FORM.RESOURCES.CPUS',
    memory: 'VM_CREATION_FORM.RESOURCES.MEMORY',
    primaryStorage: 'VM_CREATION_FORM.RESOURCES.PRIMARYSTORAGE',
  };

  public noAffinityGroupTranslation: string;
  public securityRules: Rules;

  public takenName: string;
  public sgCreationInProgress = false;
  public agCreationInProgress = false;

  public fields: Array<BaseField<any>> = [];
  public form: FormGroup;

  public defaultName: string;

  constructor(
    private affinityGroupService: AffinityGroupService,
    private changeDetectorRef: ChangeDetectorRef,
    private dialog: MdlDialogReference,
    private dialogService: DialogService,
    private instanceGroupService: InstanceGroupService,
    private jobsNotificationService: JobsNotificationService,
    private resourceUsageService: ResourceUsageService,
    private securityGroupService: SecurityGroupService,
    private translateService: TranslateService,
    private utils: UtilsService,
    private vmCreationService: VmCreationService,
    private vmService: VmService,
    private zoneService: ZoneService,

    private formService: VmFormService
  ) {
    this.vmCreationService.getData().subscribe(vmCreationData => {
      this.vmCreationData = vmCreationData;
      this.vmCreationState = vmCreationData.getState();
    });

    this.translateService.get('NO_AFFINITY_GROUP').subscribe(str => {
      this.noAffinityGroupTranslation = str;
    });
  }

  public ngOnInit(): void {
    this.fetching = true;
    this.enoughResources = true;
    this.resourceUsageService.getResourceUsage()
      .subscribe(resourceUsage => {
        Object.keys(resourceUsage.available)
          .filter(key => key !== 'snapshots' && key !== 'secondaryStorage')
          .forEach(key => {
            const available = resourceUsage.available[key];
            if (available === 0) {
              this.insufficientResources.push(key);
            }
          });

        if (this.insufficientResources.length) {
          this.enoughResources = false;
          this.fetching = false;
        } else {
          this.resetVmCreateData();
        }
      });
    // need to check if enough resources
    this.formService.toFormGroup(this.fields);
  }

  public onVmCreationSubmit(e: any): void {
    e.preventDefault();
    this.deployVm();
  }

  public onCancel(): void {
    this.dialog.hide(Observable.of());
  }

  public resetVmCreateData(): void {
    this.getVmCreateData().subscribe();
  }

  // todo: move to vmCreationService
  public deployVm(): void {
    const params = this.vmCreationState.getVmCreationParams();

    let shouldCreateAffinityGroup = false;
    let affinityGroupName = params['affinityGroupNames'];
    if (affinityGroupName) {
      const ind = this.vmCreationData.affinityGroupList.findIndex(ag => ag.name === affinityGroupName);
      if (ind === -1) {
        shouldCreateAffinityGroup = true;
      }
    }
    let securityGroupObservable = this.securityGroupService.createWithRules(
      { name: this.utils.getUniqueId() + GROUP_POSTFIX },
      params.ingress || [],
      params.egress || []
    )
      .map(securityGroup => {
        params['securityGroupIds'] = securityGroup.id;
      });

    let affinityGroupsObservable;
    if (shouldCreateAffinityGroup) {
      affinityGroupsObservable = this.affinityGroupService.create({
        name: this.vmCreationState.affinityGroup.name,
        type: this.vmCreationData.affinityGroupTypes[0].type
      })
        .map(affinityGroup => {
          this.vmCreationData.affinityGroupList.push(affinityGroup);
          this.vmCreationData.affinityGroupNames.push(affinityGroup.name);
          params['affinityGroupNames'] = affinityGroup.name;
          this.agCreationInProgress = false;
        });
    } else {
      affinityGroupsObservable = Observable.of(null);
    }

    delete params['ingress'];
    delete params['egress'];

    if (this.vmCreationState.zone.networkTypeIsBasic) {
      this.agCreationInProgress = shouldCreateAffinityGroup;
      affinityGroupsObservable
        .subscribe(() => {
          this.deploy(params);
        });
    } else {
      this.agCreationInProgress = shouldCreateAffinityGroup;
      affinityGroupsObservable
        .switchMap(() => {
          this.agCreationInProgress = false;
          this.sgCreationInProgress = true;
          return securityGroupObservable;
        })
        .subscribe(() => {
          this.sgCreationInProgress = false;
          this.deploy(params);
        });
    }
  }

  public showPassword(vmName: string, vmPassword: string): void {
    this.dialogService.customAlert({
      message: {
        translationToken: 'PASSWORD_DIALOG_MESSAGE',
        interpolateParams: { vmName, vmPassword }
      },
      width: '400px',
      clickOutsideToClose: false
    });
  }

  public notifyOnDeployDone(notificationId: string): void {
    this.jobsNotificationService.finish({
      id: notificationId,
      message: 'DEPLOY_DONE'
    });
  }

  public notifyOnDeployFailed(notificationId: string): void {
    this.jobsNotificationService.fail({
      id: notificationId,
      message: 'DEPLOY_FAILED'
    });
  }

  public get zone(): Zone {
    return this.vmCreationState.zone;
  }

  public set zone(zone: Zone) {
    this.updateZone(zone).subscribe();
  }

  public get templateSelected(): boolean {
    return this.vmCreationState.template instanceof Template;
  }

  private getVmCreateData(): Observable<void> {
    return this.zoneService.getList()
      .switchMap(zoneList => {
        this.vmCreationData.zones = zoneList;
        return this.updateZone(zoneList[0]);
      });
  }

  // todo: move to vmCreationService and return Subject<VmCreationState>
  private deploy(params): void {
    let deployObservable = new Subject();
    let notificationId: string;
    let deployResponseVm: any;

    this.vmService.deploy(params)
      .switchMap(deployResponse => {
        notificationId = this.jobsNotificationService.add('VM_DEPLOY_IN_PROGRESS');

        this.vmService.get(deployResponse.id)
          .subscribe(vm => {
            deployResponseVm = vm;
            vm.state = 'Deploying';
            deployObservable.next(vm);
            deployObservable.complete();
          });

        this.vmService.incrementNumberOfVms().subscribe();

        this.sgCreationInProgress = false;
        this.dialog.hide(deployObservable);
        return this.vmService.registerVmJob(deployResponse);
      })
      .switchMap(vm => {
        if (this.vmCreationState.instanceGroup) {
          return this.instanceGroupService.add(vm, this.vmCreationState.instanceGroup);
        }
        return Observable.of(vm);
      })
      .subscribe(
        vm => {
          if (vm.instanceGroup) {
            this.instanceGroupService.groupsUpdates.next();
          }

          this.notifyOnDeployDone(notificationId);
          if (!vm.password) {
            return;
          }

          this.showPassword(vm.displayName, vm.password);
          this.vmService.updateVmInfo(vm);
        },
        err => {
          if (deployResponseVm) {
            deployResponseVm.state = 'Error';
            this.vmService.updateVmInfo(deployResponseVm);
          }

          this.sgCreationInProgress = false;
          this.agCreationInProgress = false;
          this.translateService.get(err.message, err.params)
            .subscribe(str => this.dialogService.alert(str));

          this.notifyOnDeployFailed(notificationId);
        }
      );
  }

  private setDiskOfferings(diskOfferings: Array<DiskOffering>): void {
    let filteredDiskOfferings = diskOfferings.filter((diskOffering: DiskOffering) => {
      return diskOffering.diskSize < this.vmCreationData.availablePrimaryStorage;
    });

    if (!filteredDiskOfferings.length) {
      this.enoughResources = false;
      this.dialogService.alert('VM_CREATION_FORM.NO_DISK_OFFERING');
    } else {
      this.vmCreationData.diskOfferings = diskOfferings;
      this.vmCreationState.diskOffering = diskOfferings[0];
    }
  }

  private updateZone(zone: Zone): Observable<void> {
    this.vmCreationState.reset();
    this.vmCreationState.zone = zone;
    if (!zone || !this.vmCreationData || !this.vmCreationData.zones) { return Observable.of(null); }

    this.vmCreationState.serviceOffering = new ServiceOffering({ id: null });
    this.changeDetectorRef.detectChanges();
    this.vmCreationService.getData().subscribe(vmCreationData => {
      this.setDiskOfferings(vmCreationData.diskOfferings);
      this.vmCreationState.template = vmCreationData.defaultTemplate;
      this.vmCreationState.securityRules = this.vmCreationData.preselectedRules;
      this.changeDetectorRef.detectChanges();
      this.fetching = false;
    });
  }
}
