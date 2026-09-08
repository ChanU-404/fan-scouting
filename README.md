# Fan Scouting

KBO 야구 선수 정보와 스카우팅 화면을 제공하는 React/Vite 프런트엔드와 Express API 프로젝트입니다.

## 실행

Node.js와 npm을 준비하고 프로젝트 폴더에서 실행합니다.

```sh
npm ci
npm run dev
```

배포용 빌드: `npm run build`.

## 구성과 참고

프런트엔드는 `src/`, API는 `api/`, 정적 자산은 `public/`에 있습니다.

API는 PostgreSQL `DATABASE_URL`과 인증용 `JWT_SECRET` 환경 변수를 사용합니다. 로컬 환경에서 별도로 설정하세요. `npm run start:api`로 API를 실행합니다. DB 준비 스크립트는 `api/init_pg.js`를 검토한 후 필요한 환경에서 실행하세요. 개발용 크롤링·진단 스크립트도 포함됩니다.

환경 설정과 인증 정보, 설치된 의존성 및 로컬 생성물은 저장소에서 제외합니다.
