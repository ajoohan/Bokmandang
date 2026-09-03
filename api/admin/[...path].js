/* 관리자 API 라우터 — /api/admin/* 를 이 함수 하나가 모두 받습니다.
 *
 * 왜 합쳤나
 *   Vercel Hobby 요금제는 한 배포에 서버리스 함수를 12개까지만 허용합니다.
 *   관리자 화면이 늘면서 함수가 14개가 되어 배포가
 *   exceeded_serverless_functions_per_deployment 로 실패했습니다.
 *   실제 처리는 api/_admin/ 의 파일들이 그대로 하고, 이 파일은 넘겨주기만 합니다.
 *   (api/_admin 처럼 밑줄로 시작하는 폴더는 Vercel 이 라우트로 만들지 않습니다)
 *
 * 주소는 그대로입니다 — /api/admin/stores, /api/admin/menu … 프런트엔드는 손댈 것이 없습니다.
 * 새 관리자 API 를 추가할 때는 api/_admin/ 에 파일을 만들고 아래 ROUTES 에만 등록하세요.
 */
import inquiries from '../_admin/inquiries.js';
import login     from '../_admin/login.js';
import logout    from '../_admin/logout.js';
import menu      from '../_admin/menu.js';
import menuPhoto from '../_admin/menu-photo.js';
import popups    from '../_admin/popups.js';
import session   from '../_admin/session.js';
import settings  from '../_admin/settings.js';
import stores    from '../_admin/stores.js';

const ROUTES = {
  'inquiries':   inquiries,
  'login':       login,
  'logout':      logout,
  'menu':        menu,
  'menu-photo':  menuPhoto,
  'popups':      popups,
  'session':     session,
  'settings':    settings,
  'stores':      stores
};

export default function handler(req, res) {
  /* [...path] 는 세그먼트 배열로 들어옵니다. /api/admin/stores → ['stores'] */
  const raw = (req.query && req.query.path) || [];
  const name = Array.isArray(raw) ? raw.join('/') : String(raw);

  /* ROUTES[name] 으로만 보면 'constructor' 같은 프로토타입 속성이 함수로 잡힙니다 */
  if (!Object.hasOwn(ROUTES, name)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: '없는 주소입니다.' });
  }
  return ROUTES[name](req, res);
}
