# ADR-0001: apps/web을 Workers Static Assets에 호스팅한다

- 상태: 채택 (2026-10-14, 이슈 #36)
- 대체: Q45·Q52의 Cloudflare Pages 배포

## 배경

Q45는 `apps/web`을 Cloudflare Pages에 정적 배포하기로 했다. Cloudflare Workers Best Practices는 새 프로젝트에 Pages 대신 Workers를 권한다. 소유자가 2026-10-14에 Workers로 옮기기로 정했다.

문서에는 "Cloudflare Vite plugin은 SPA mode와 prerender를 지원하지 않는다"는 주의가 있다. 그래서 먼저 로컬 spike로 구성이 되는지 확인했다. 실제 계정에는 로그인하지도 배포하지도 않았다.

## 결정

- `apps/web`은 별도 Worker + Static Assets로 호스팅한다. Worker 코드는 없다(`main` 없음).
- 빌드는 plain `react-router build`다. Cloudflare Vite plugin은 쓰지 않는다.
- `wrangler.jsonc`는 `assets.directory: ./build/client`, `not_found_handling: "single-page-application"`이다.
- `public/_redirects`에 `/admin`과 `/admin/*`를 `/__spa-fallback 200`으로 rewrite한다. (아래 발견 1)
- `public/_headers`로 보안 header를 붙인다.
- Web과 API는 별도 Worker로 둔다. 보안 경계와 배포 결합을 분리하기 위해서다.
- Cloudflare Access에는 `/admin`과 `/admin/*`를 둘 다 등록한다.
- CI: 미리보기는 Workers Builds 또는 `wrangler versions upload --preview-alias`, staging은 `wrangler deploy --env staging`, release는 gradual deployment와 `wrangler rollback`이다.

## Spike 증거

환경: macOS, Node 로컬, 별도 scratch 폴더. 버전: react-router / @react-router/dev 8.4.0, vite 8.3.4, wrangler 4.151.0, @cloudflare/vite-plugin 1.64.0. 앱은 `ssr: false`, `prerender: ["/"]`, 랜딩 route 1개와 `admin/*` client route 1개다.

`react-router build` 결과 `build/client`에 `index.html`(prerender된 `/`), `__spa-fallback.html`, `_headers`, `_redirects`, `assets/`가 생겼다.

| 확인 | 결과 |
|---|---|
| `/`에 랜딩 문구가 HTML에 있음 | 통과 (curl로 `LANDING_PRERENDERED_TEXT` 확인) |
| `/admin`, `/admin/foo`, `/admin/a/b`가 SPA를 200으로 반환 | 통과 (rewrite 적용 후) |
| 브라우저에서 admin 렌더링, 콘솔 오류 없음 | 통과 (rewrite 적용 후) |
| `_headers` 적용 | 통과 (`x-spike-header: ok`, `x-content-type-options: nosniff`가 `/`, rewrite 응답 모두에 있음) |
| 없는 asset (`/x.png`, `/assets/none.js`) | 200 + `text/html` (SPA fallback). 404가 아님 |
| Cloudflare Vite plugin + prerender | 실패 (아래) |

### 발견 1: 기본 SPA fallback은 landing HTML을 돌려준다

`not_found_handling: "single-page-application"`만 쓰면 `/admin/foo`가 `index.html`, 곧 prerender된 랜딩을 받는다. 상태는 200이다. 브라우저는 landing HTML을 admin URL로 hydrate하다가 React error #418(hydration mismatch)을 내고, client render로 복구해 admin을 그린다. 화면은 맞지만 오류와 깜빡임이 생긴다.

React Router는 prerender 시 SPA 전용 shell을 `__spa-fallback.html`로 따로 만든다. `_redirects`로 admin 경로를 그 파일에 연결하면 해결된다.

```text
/admin /__spa-fallback 200
/admin/* /__spa-fallback 200
```

`/__spa-fallback.html`로 연결하면 `html_handling` 때문에 307이 `/__spa-fallback`로 간다. 확장자 없는 경로로 써야 rewrite(200)가 된다.

```text
$ curl -sI :8799/admin/foo   # rewrite 후
HTTP/1.1 200 OK    (body: HydrateFallback shell)
```

### 발견 2: Vite plugin 경로는 문서대로 막혀 있다

`cloudflare({ viteEnvironment: { name: "ssr" } })`와 `reactRouter()`를 함께 두고 `ssr: false`, `prerender: ["/"]`로 빌드했다.

```text
Error: Prerender paths missing
  at invariant (@react-router/dev/dist/routes-*.js)
  at requests (@react-router/dev/dist/vite.js)
The following error is a bug in React Router; please open an issue!
```

문서의 "SPA mode and prerendering are not supported" 주의가 맞다. 이 경로는 쓰지 않는다.

## 결과

- 얻는 것: Pages 대신 Workers 단일 플랫폼. 미리보기·staging·rollback 도구가 API와 같다. 정적 HTML이라 SEO 요구(Q45)를 그대로 충족한다.
- 감수할 것 1: SPA fallback이 없는 asset도 200 HTML로 답한다. 깨진 asset 링크가 404로 드러나지 않는다. 필요하면 `/assets/*`에 대한 404 규칙을 후속으로 검토한다.
- 감수할 것 2: `_redirects`의 admin 경로 목록을 route와 맞춰야 한다. 새 SPA 전용 경로가 `/admin` 밖에 생기면 같이 추가한다.
- 감수할 것 3: Vite plugin 경로를 쓸 수 없어 Cloudflare 전용 dev 환경은 얻지 못한다. 로컬 확인은 `react-router build` 후 `wrangler dev`로 한다.
- 미검증: 실제 계정의 Workers Builds, `--preview-alias`, gradual deployment, `wrangler rollback`, Access 정책은 소유자 인증이 필요해 실행하지 않았다. 첫 배포 때 확인한다.

## 출처

- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/routing/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/
- https://developers.cloudflare.com/workers/vite-plugin/
- https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/
- https://reactrouter.com/how-to/spa
