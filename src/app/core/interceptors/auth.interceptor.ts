import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const router  = inject(Router);
  const token   = storage.getToken();

  // Ajouter Bearer token si disponible
 const authReq = token
  ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }
    })
  : req.clone({
      setHeaders: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }
    });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 → session expirée → retour login
      if (error.status === 401) {
        storage.clearToken();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};