import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { RestService } from "../services/rest.service";
import { finalize } from "rxjs";

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
    if(req.params.get('notShowLoader') === 'true'){
        return next(req);
    }
    const restService = inject(RestService);
    restService.inLoading.next(restService.inLoading.value + 1)
    return next(req).pipe(
        finalize(() => restService.inLoading.next(restService.inLoading.value - 1))
    );
};