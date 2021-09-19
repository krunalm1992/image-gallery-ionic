import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActionSheetController, AlertController, LoadingController, Platform, ToastController} from '@ionic/angular';
import {ApiImage, ApiResponse, HttpService} from '../core/services/http.service';
import {Observable, Subject} from 'rxjs';
import {environment} from '../../environments/environment';
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {

  @ViewChild('fileInput', { static: false }) fileInput: ElementRef;

  images: ApiImage[] = [];
  apiBaseUrl = environment.apiBaseUrl;
  notifier = new Subject<void>();

  constructor(
    private actionSheetCtrl: ActionSheetController,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private plt: Platform,
    private http: HttpService
  ) {}

  ngOnInit() {
    this.http.getImages().pipe(takeUntil(this.notifier)).subscribe((images) => {
      this.images = images;
    });
  }

  ngOnDestroy() {
    this.notifier.next();
    this.notifier.complete();
  }

  async selectImageSource() {
    const buttons = [
      {
        text: 'Take Photo',
        icon: 'camera',
        handler: () => {
          this.addImage(CameraSource.Camera);
        }
      },
      {
        text: 'Choose From Photos Photo',
        icon: 'image',
        handler: () => {
          this.addImage(CameraSource.Photos);
        }
      }
    ];

    // Only allow file selection inside a browser
    if (!this.plt.is('hybrid')) {
      buttons.push({
        text: 'Choose a File',
        icon: 'attach',
        handler: () => {
          this.fileInput.nativeElement.click();
        }
      });
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Image Source',
      buttons
    });
    await actionSheet.present();
  }

  async addImage(source: CameraSource) {
    const image = await Camera.getPhoto({
      quality: 60,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source
    });
    this.loadingController.create().then(loader => {
      loader.present();
      const blobData = this.b64toBlob(image.base64String, `image/${image.format}`);

      this.http.uploadImage(blobData, image.format).pipe(takeUntil(this.notifier)).subscribe((response: ApiResponse<ApiImage>) => {
        loader.dismiss();
        this.handleResponseOfUpload(response);
      });
    });
  }

  // Used for browser direct file upload
  uploadFile(event: EventTarget) {
    const eventObj: MSInputMethodContext = event as MSInputMethodContext;
    const target: HTMLInputElement = eventObj.target as HTMLInputElement;
    const file: File = target.files[0];

    this.loadingController.create().then(loader => {
      loader.present();
      this.http.uploadImageFile(file).pipe(takeUntil(this.notifier)).subscribe((response: ApiResponse<ApiImage>) => {
        loader.dismiss();
        this.handleResponseOfUpload(response);
      });
    });
  }

  handleResponseOfUpload(response: ApiResponse<ApiImage>) {
    if (response.status === 200) {
      this.images.push(response.data);
      this.presentToast(response.messages);
    } else {
      // show error msg
      this.presentToast(response.messages);
    }
  }

  async deleteImage(image: ApiImage) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Delete!',
      message: 'Are you sure you want to delete this image?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Confirm Cancel: blah');
          }
        }, {
          text: 'Okay',
          handler: () => {
            this.loadingController.create().then(loader => {
              loader.present();
              this.http.deleteImage(image.id).pipe(takeUntil(this.notifier)).subscribe((response: ApiResponse<boolean>) => {
                loader.dismiss();
                if (response.status === 200) {
                  this.images.splice(this.images.indexOf(image), 1);
                  this.presentToast(response.messages);
                } else {
                  this.presentToast(response.messages);
                }
              });
            });
          }
        }
      ]
    });

    await alert.present();
  }

  // Helper function
  b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

  presentToast(message: string) {
    this.toastController.create({
      message,
      duration: 2000
    }).then(toast => toast.present());
  }

}
