import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {pluck} from 'rxjs/operators';
import {Observable} from 'rxjs';

export interface ApiResponse<T> {
  status: number;
  error: boolean;
  messages: string;
  data: T;
}

export interface ApiImage {
  id: number;
  file_name: string;
  file_path: string;
}

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  url = environment.apiBaseUrl;

  constructor(
    private http: HttpClient
  ) { }

  getImages(): Observable<ApiImage[]> {
    return this.http.get<ApiResponse<ApiImage[]>>(`${this.url}/api/list-images`).pipe(
      pluck('data')
    );
  }

  uploadImage(blobData, ext) {
    const formData = new FormData();
    formData.append('image', blobData, `myimage.${ext}`);

    return this.http.post<ApiResponse<ApiImage>>(`${this.url}/api/upload-image`, formData);
  }

  uploadImageFile(file: File) {
    const ext = file.name.split('.').pop();
    const formData = new FormData();
    formData.append('image', file, `myimage.${ext}`);

    return this.http.post<ApiResponse<ApiImage>>(`${this.url}/api/upload-image`, formData);
  }

  deleteImage(id) {
    return this.http.delete(`${this.url}/api/delete-image/${id}`);
  }
}
