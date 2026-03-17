import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const router  = inject(Router);
  const token   = storage.getToken();

  // ⚠️ Ne jamais forcer Content-Type sur FormData
  // Le browser gère automatiquement le multipart/form-data + boundary
  const isFormData = req.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Content-Type JSON uniquement si ce n'est pas un upload fichier
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const authReq = req.clone({ setHeaders: headers });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        storage.clearToken();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};