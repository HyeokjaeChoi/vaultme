# VaultMe release 사용 규칙

**현재 상태는 `outputs/vaultme-release.json`에서 확인합니다.** 현재 release와 마지막 Published Library snapshot은 다른 필드입니다. `pending`이면 새 검증이 끝나지 않았습니다.

## Package 선택

| Profile | 전달 파일 | 내용 | 사용 |
| --- | --- | --- | --- |
| consumer | `outputs/VaultMe-consumer-package.zip` | Token JSON/CSS, guide, Component 계약과 recipes, `outputs/foundation/` portal, 독립 소비 예제, icon/font assets와 licenses | 소비 구현과 portable import |
| audit | `outputs/VaultMe-foundation-package.zip` | consumer 내용, generator, native ID ledger, 연구와 검증 증거, synthetic Prototype | Source 검토와 이력 보관. 기존 ZIP 경로 유지 |
| prototype | `outputs/VaultMe-prototype-package.zip` | Synthetic HTML Prototype와 필요한 CSS/assets | 선택 기능. `--with-prototype`로 생성 |

각 ZIP은 project-relative path를 유지합니다. ZIP을 푼 root에서 `python3 -m http.server 8765 --bind 127.0.0.1`을 실행합니다. Consumer portal은 `/outputs/foundation/`입니다. Prototype은 `/outputs/vaultme-v2-review/`입니다. Prototype에는 실제 wallet/RPC/signing 기능이 없습니다.

Tokens Studio JSON import, 기존 native Figma source 편집, Published Library subscription은 별도 작업입니다. 기존 native source에 전체 JSON을 다시 import하지 않습니다. Primitive → Semantic → Component 계층을 유지합니다. UI에는 가장 구체적인 Component alias를 사용합니다. Component role이 없을 때 Semantic alias를 사용합니다. Primitive typography CSS utility는 token 정의와 비교를 위한 public 표기입니다. Component 소비 예제에서 semantic 또는 component 계약을 건너뛰는 권한이 아닙니다.

## Release ID와 상태

`vaultme-YYYY-MM-DD-rN` 같은 새 ID를 선택합니다. 한 ID의 `candidate.json`, manifest, ZIP, verifier report는 덮어쓰지 않습니다. Source가 바뀌면 새 ID를 만듭니다.

`outputs/releases/<releaseId>/`에 build descriptor와 각 profile의 manifest/ZIP이 있습니다. 외부 `verification/`에는 실행마다 새 verifier report가 있습니다. `outputs/vaultme-release.json`은 이 immutable 파일을 가리키는 현재 상태 pointer입니다. ZIP과 manifest는 이 pointer와 자신을 검증할 report를 포함하지 않습니다. Self-hash cycle이 없습니다. Exported ZIP에는 현재 상태 pointer가 없습니다. ZIP의 profile manifest에서 release ID와 source digest를 읽습니다. 검증 report는 해당 ID의 외부 evidence로 함께 전달합니다.

| 상태 | 뜻 |
| --- | --- |
| pending | 준비 중. 새 성공 flag 없음 |
| built-pending-verification | 파일을 묶음. 실제 verifier는 아직 실행하지 않음 |
| verified-local | 현재 파일, manifests, ZIP, mirror, 제공된 proof 연결을 검사함 |
| failed / failed-verification / failed-closure | Build 또는 검증 실패. 완료 flag는 false |

`packageVerified`는 byte 검증입니다. `nativeSourceVerified`와 `libraryPublicationVerified`는 현재 token digest와 일치하는 제공된 proof가 있을 때만 기록합니다. Remote Figma 관찰은 proof 작성자의 책임입니다. Local verifier는 실제 UI 관찰을 대신하지 않습니다. `consumerWebVerified`와 `consumerFigmaVerified`는 각각의 별도 소비 proof가 있을 때만 기록합니다. 두 proof가 모두 있을 때만 `consumerAdoptionVerified`를 true로 기록합니다. Native keyboard, manual screen reader, 실제 wallet runtime은 package 검증 범위에 없습니다.

## 도구와 지원 범위

Packager는 Python 3.10 이상과 표준 library를 사용합니다. 실행한 Python version은 candidate에 저장합니다. Figma client와 Tokens Studio의 지원 version은 추정하지 않습니다. 실제 import/subscription을 검사한 tool version과 environment는 해당 소비 증거에 기록합니다. 제공된 HTML/CSS는 preview 소비 예제입니다. Browser 지원 범위는 실제 검사 기록에서 확인합니다.

기존 stable token paths와 source IDs를 유지합니다. 새로운 recipe, HTML 소비 예제, 검증되지 않은 tool 조합은 preview입니다. Deprecated token/property에는 대체 경로와 migration note를 둡니다. 제거에는 owner 승인과 실제 소비 변경 검토가 필요합니다. 단순히 시간이 지난 이유로 제거하지 않습니다. 최소 두 번의 승인된 release 동안 alias를 유지하고, 사용 중인 소비자의 변경 확인 후 제거합니다.

## Owner, review, 예외

Foundation owner는 compatibility 변경과 publication을 승인합니다. Native source writer는 한 명입니다. Reviewer는 변경 source, 영향을 받은 frame, icon foreground, accessible output, full wallet context를 확인합니다. 검토자 이름과 시각은 실제 review proof에 기록합니다. 준비 script는 사람 이름이나 review 완료를 만들지 않습니다.

예외가 필요하면 영향 Component, 사유, 대체 동작, owner, 만료일을 evidence에 기록합니다. 만료한 예외는 다음 release 전에 다시 검토합니다. 검증이 빠진 범위는 pending 또는 unverified로 유지합니다.

## 이력과 rollback

첫 새 package build는 기존 audit ZIP/manifest와 2026-10-03 publication proof를 `outputs/releases/legacy-2026-10-03-<manifestHash>/`에 보관합니다. 이 보관 작업은 과거 package를 새로 검증했다는 뜻이 아닙니다. 다음 release는 이전 immutable candidate를 연결합니다.

Portable consumer rollback은 이전 release ID의 consumer ZIP을 새 폴더에 풉니다. 이전 manifest와 ZIP SHA-256을 확인합니다. 앱에서 해당 JSON/CSS/assets를 함께 복원합니다. 현재 release와의 token/property 차이를 migration note로 검토합니다. 소비 결과와 복원 시각을 adoption record에 기록합니다.

Figma rollback은 별도 작업입니다. 기존 source file과 master IDs를 유지합니다. 이전 ledger와 proof를 비교합니다. 필요한 native 변경만 되돌립니다. 영향을 받은 frame과 bindings를 확인한 뒤 새 Library update를 검토하고 publish합니다. 과거 전체 JSON을 기존 source에 다시 import하지 않습니다. 소비 파일은 해당 Library update를 검토한 뒤 적용합니다.

## 최종 실행 순서

1. Code와 docs 변경을 마칩니다. Native 변경 범위를 정합니다.
2. `python3 work/build_foundation.py`를 실행합니다. Token JSON/CSS/map과 contrast 결과를 확인합니다.
3. 변경된 digest로 필요한 native source를 수정합니다. 실제 검토와 Library publication을 확인한 뒤 proof를 저장합니다. Primary ledger와 mirror를 같은 byte로 저장합니다.
4. Browser/keyboard/consumer 검증을 실행합니다. 환경, digest, 한계와 결과를 저장합니다.
5. `docs-readiness.json` 등 package에 들어갈 최종 증거를 마칩니다. `outputs/foundation/` portal을 생성합니다. 이후 package payload를 수정하지 않습니다.
6. 아래 package 명령을 실행합니다. Proof가 없는 scope는 해당 option을 생략합니다. 성공으로 표시하지 않습니다.
7. `verify_package.py --finalize`를 실행합니다. 성공한 실제 report가 있을 때만 현재 package 상태를 갱신합니다.
8. 실패하거나 payload를 수정하면 새 release ID로 5–7단계를 다시 실행합니다.

```sh
python3 work/v2/package_foundation.py --release-id vaultme-2026-10-04-r1 --consumer-dir outputs/vaultme-consumer-example --with-prototype --native-proof work/v2/verification/current-native-proof.json --publication-proof work/v2/verification/current-publication-proof.json
python3 work/v2/verify_package.py --release-id vaultme-2026-10-04-r1 --finalize
```

위 proof 파일명은 입력 예시입니다. 실제 관찰한 파일 경로를 지정합니다. 존재하지 않는 예시를 만들거나 통과 결과를 복사하지 않습니다. 다른 소비 directory를 사용하면 `--consumer-dir`로 지정합니다. `outputs/foundation/`는 항상 consumer profile에 포함합니다.

Native proof JSON에는 `fileKey`, 현재 token byte의 `sourceDigest`, 실제 `observedAt` 또는 `dateKST`, `verificationPassed: true`, local `evidence` 또는 `proofs` 경로 목록이 필요합니다. 해당 결과는 실제 native 검토 후 작성합니다. Native ledger의 `v2.sourceDigest`도 일치해야 합니다.

Publication proof JSON에는 같은 `fileKey`/`sourceDigest`, 실제 관찰 날짜, `status: published` 또는 `published-and-ui-confirmed`, local proof 목록이 필요합니다. Ledger의 `libraryPublication.status`와 `sourceDigest`도 일치해야 합니다. 과거 publication proof를 새 digest의 proof로 사용하면 verifier가 거부합니다.

`close_icons_release.py`는 호환 entry point입니다. 현재 release를 다시 검증하고 finalize합니다. 2026-10-03 단발 script는 `work/v2/history/2026-10-03-close-icons-release.py.txt`에 보관합니다. 실행하지 않습니다.

독립 소비 proof는 `--consumer-proof PATH`로 scope별 한 개씩 제공할 수 있습니다. `releaseId`, 현재 `sourceDigest`, `scope: web` 또는 `figma`, 관찰 날짜, 실제 `verificationPassed: true`, local evidence 목록이 필요합니다. Web proof는 검사한 `sourceFiles`의 `path`, `bytes`, `sha256`을 포함합니다. Figma proof는 `sourceLibraryFileKey`, 다른 `consumerFileKey`, 실제 `subscriptionVerified`, `updateVerified`, `overrideRetentionVerified` 결과를 포함합니다. 이 필드는 실제 검사 결과입니다. Proof JSON에 true를 직접 넣는 작업은 검사를 대신하지 않습니다.

Consumer export는 Portal/Markdown의 local 파일 경로를 검사합니다. Markdown 원본은 byte를 그대로 보존합니다. 원본의 audit/workspace-only 경로는 closure report에 별도로 기록합니다. `outputs/components/`, Portal의 Markdown 원본, `PRODUCT.md`, 최소 token map/native ID ledgers를 포함합니다. Research 전체와 synthetic Review는 consumer에 넣지 않습니다. 해당 참조는 `audit/source workspace`로 표시합니다. 현재 mutable release 링크는 consumer의 immutable package manifest로 바꿉니다. HTML export 변경은 manifest의 `exportOverrides`에 source/export hash를 따로 기록합니다. Audit profile은 원본 byte를 보존합니다.
