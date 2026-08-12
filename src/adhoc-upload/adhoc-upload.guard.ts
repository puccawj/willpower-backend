import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

// Only these filenames are ever written here — the Ad Hoc iOS install flow (see
// ios/fastlane/Fastfile's `adhoc` lane and .github/workflows/ios-build.yml) always
// produces exactly these, served from the same names by the /adhoc/ nginx location.
// install.html is the tappable landing page — iOS Safari generally refuses
// itms-services:// links typed directly into the address bar, only ones tapped from an
// actual page.
export const ADHOC_ALLOWED_FILENAMES = new Set(['App.ipa', 'manifest.plist', 'install.html']);

// Runs before AdhocUploadController's FileInterceptor, which is the point — multer's
// diskStorage `filename` callback executes as part of request parsing, before any
// checks in the route handler's body would run, so validating here (in a Guard) is the
// only way to actually block an unauthenticated or path-traversing write before it
// touches disk.
@Injectable()
export class AdhocUploadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const expected = process.env.ADHOC_UPLOAD_TOKEN;
    const authHeader = req.headers['authorization'];
    if (!expected || authHeader !== `Bearer ${expected}`) {
      throw new UnauthorizedException('Invalid or missing upload token.');
    }

    if (!ADHOC_ALLOWED_FILENAMES.has(String(req.params['filename']))) {
      throw new BadRequestException('Unknown filename.');
    }

    return true;
  }
}
