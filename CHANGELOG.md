## [0.4.1](https://github.com/marcosgenesis/tatamiq/compare/v0.4.0...v0.4.1) (2026-07-03)


### Bug Fixes

* **pre-registration:** harden public form against malformed and cross-tenant input ([0d91919](https://github.com/marcosgenesis/tatamiq/commit/0d91919f4ac92ddb8325a10be41c75e3ac39e13d))
* **pre-registration:** validate declared degree and future birthdate on the student form ([e1a81a4](https://github.com/marcosgenesis/tatamiq/commit/e1a81a4739530caa96de4be0ba65b3a92073b051))

# [0.4.0](https://github.com/marcosgenesis/tatamiq/compare/v0.3.0...v0.4.0) (2026-07-02)


### Bug Fixes

* responsibles ([a136895](https://github.com/marcosgenesis/tatamiq/commit/a1368955bb2eaed8e93d8bbf6c087877711b49be))


### Features

* **auth:** validate and normalize user, academy and profile names ([5059f65](https://github.com/marcosgenesis/tatamiq/commit/5059f654a7d9f429d8a2f7da1a3d55b29cb7a66c))
* **platform:** support multiple academy responsibles ([f00783f](https://github.com/marcosgenesis/tatamiq/commit/f00783f7559658c176afa76445c83359c719a4e8))

# [0.3.0](https://github.com/marcosgenesis/tatamiq/compare/v0.2.1...v0.3.0) (2026-06-19)


### Bug Fixes

* **api:** audit failed platform admin actions ([#189](https://github.com/marcosgenesis/tatamiq/issues/189)) ([a696b9c](https://github.com/marcosgenesis/tatamiq/commit/a696b9c6b2109a1c0c30695f072cc5e6f42e90e8))
* **api:** bind R2 upload confirmations to issued keys ([#183](https://github.com/marcosgenesis/tatamiq/issues/183)) ([496b9de](https://github.com/marcosgenesis/tatamiq/commit/496b9de21ac386d6f546e3069cd22d267035976c))
* **api:** catch up missed monthly fees ([#182](https://github.com/marcosgenesis/tatamiq/issues/182)) ([3b2ba3b](https://github.com/marcosgenesis/tatamiq/commit/3b2ba3bc7460f95ce2669ebbde4929bd24934a7c))
* **api:** enforce inactive student read-only lifecycle ([#186](https://github.com/marcosgenesis/tatamiq/issues/186)) ([c3f4490](https://github.com/marcosgenesis/tatamiq/commit/c3f44909954117d0817c13920c40232636b130e2))
* **api:** expose out-of-group student attendance ([#190](https://github.com/marcosgenesis/tatamiq/issues/190)) ([00d4988](https://github.com/marcosgenesis/tatamiq/commit/00d4988caa4699631266b2b0377d948cc8790ea4))
* **api:** redact email and request log secrets ([#180](https://github.com/marcosgenesis/tatamiq/issues/180)) ([884e648](https://github.com/marcosgenesis/tatamiq/commit/884e648d553589c1a1c50f95be0892e741208c60))
* **api:** wrap student and class group writes in transactions ([#187](https://github.com/marcosgenesis/tatamiq/issues/187)) ([1d038d8](https://github.com/marcosgenesis/tatamiq/commit/1d038d8eacb9593e80dc579baf658492608bde17))
* **auth:** only show area chooser for multiple accesses ([91f7195](https://github.com/marcosgenesis/tatamiq/commit/91f719522fae974a74911abf25161bd2b667bc70))
* **auth:** reset stale session before public sign up ([0006948](https://github.com/marcosgenesis/tatamiq/commit/00069485876982bce90c5459483431b2c9570221))
* **class-groups:** scope list cache by active academy ([7854a49](https://github.com/marcosgenesis/tatamiq/commit/7854a494330e20b33ac26a5a32ac613f028ebc63))
* **database:** register pre-registration cpf migration ([dc34d09](https://github.com/marcosgenesis/tatamiq/commit/dc34d09c3733d3398d815df910e255a051889e48))
* lint ([8af905c](https://github.com/marcosgenesis/tatamiq/commit/8af905ca6156a675e68607a7bb54ae59882aef2f))
* persist pre-registration follow-up actions ([#177](https://github.com/marcosgenesis/tatamiq/issues/177)) ([006c033](https://github.com/marcosgenesis/tatamiq/commit/006c0333d3e6787d2ad5d85daba8fe171116488c))
* **platform:** activate support after impersonation redirect ([655fcbe](https://github.com/marcosgenesis/tatamiq/commit/655fcbeefdecf7a8d300acd712815fd3f33949ce))
* **platform:** block support targeting platform admins ([bdf1933](https://github.com/marcosgenesis/tatamiq/commit/bdf1933a8a6ce73c92ce072362fda2136fd836ed))
* **platform:** preserve assisted support handoff across impersonation ([5258db2](https://github.com/marcosgenesis/tatamiq/commit/5258db23dac9da421ad5f726d9aa37affaa74cfc))
* **platform:** protect admin ban and delete paths ([#181](https://github.com/marcosgenesis/tatamiq/issues/181)) ([f33dc42](https://github.com/marcosgenesis/tatamiq/commit/f33dc420af1d38408b433e6a6fb0c04738bcdbbb))
* **platform:** scope admin access cache by session user ([4593b64](https://github.com/marcosgenesis/tatamiq/commit/4593b649ba2e9ae5fc4b59887d5de20d1764483a))
* **platform:** wait for support impersonation activation before routing ([2023c16](https://github.com/marcosgenesis/tatamiq/commit/2023c161d82f2b5530393f3d8bf4afdcddfab20e))
* route existing-account first access correctly ([#178](https://github.com/marcosgenesis/tatamiq/issues/178)) ([34d064f](https://github.com/marcosgenesis/tatamiq/commit/34d064ffe391be2981fbab9ef1f735a714d0a227))
* **schedule:** preserve sao paulo class times ([#185](https://github.com/marcosgenesis/tatamiq/issues/185)) ([49dd255](https://github.com/marcosgenesis/tatamiq/commit/49dd2554887c730460909debd92e6726fd297332))
* some random fixes ([474d64d](https://github.com/marcosgenesis/tatamiq/commit/474d64dbc9437117351cdd93de618a2a9886549a))
* **students:** allow editing unchanged duplicate email ([44277f1](https://github.com/marcosgenesis/tatamiq/commit/44277f1b2329c6011d0fc4c3b10f57bbd25eab84))
* **students:** reject stale belt selection before submit ([b7c5169](https://github.com/marcosgenesis/tatamiq/commit/b7c5169c3e4430b8633934d1aebcbd74d2feac39))
* **students:** update pre-registration link cache from mutation ([afe270a](https://github.com/marcosgenesis/tatamiq/commit/afe270ae71a48676a3054933b4f0ee3821941e99))
* tests ([4fa3aa3](https://github.com/marcosgenesis/tatamiq/commit/4fa3aa37f52b70a52f00972cf8ef3ae4e69feb2d))
* tests ([260691b](https://github.com/marcosgenesis/tatamiq/commit/260691ba9104a71222c1c407f77c0aed5ee757a8))
* **web:** isolate frontend caches by session and academy ([de9bbd0](https://github.com/marcosgenesis/tatamiq/commit/de9bbd0ee5e7b07acea3f960c2f693478f104dba))
* **web:** scope academy list caches by active academy ([8731d0a](https://github.com/marcosgenesis/tatamiq/commit/8731d0aa8cd16b2f12945c9e60eeee2b0f737e47))


### Features

* **monthly-fees:** add manual missing fee generation ([fa757d5](https://github.com/marcosgenesis/tatamiq/commit/fa757d578e80752e9b9fc1b0a867e7c2e1f5281c))
* **monthly-fees:** redesign Nova mensalidade drawer ([#194](https://github.com/marcosgenesis/tatamiq/issues/194)-199) ([36c3b21](https://github.com/marcosgenesis/tatamiq/commit/36c3b21140345a94a4f321d31f046024d097b4b8)), closes [#194-199](https://github.com/marcosgenesis/tatamiq/issues/194-199)
* **platform:** add light theme variant for assisted support banner ([dcbdbf6](https://github.com/marcosgenesis/tatamiq/commit/dcbdbf6eeff541c58d491de86b30236f6d364965))
* **platform:** redesign assisted support banner for dark admin theme ([d9f9dd7](https://github.com/marcosgenesis/tatamiq/commit/d9f9dd77aefb6e1dca64d1468efb56b59e9d9ed9)), closes [#1c1402](https://github.com/marcosgenesis/tatamiq/issues/1c1402)
* **pre-registration:** add CPF/faixa/grau to public form ([#192](https://github.com/marcosgenesis/tatamiq/issues/192)) ([680e97a](https://github.com/marcosgenesis/tatamiq/commit/680e97a7aba2959ae2cf22f2d6d6076b485851fa))
* **pre-registrations:** redesign tab with QR code and segmented filters ([#215](https://github.com/marcosgenesis/tatamiq/issues/215)-218) ([ee5422e](https://github.com/marcosgenesis/tatamiq/commit/ee5422ed65bf54652ca1e09ce6921a55bf8845bb)), closes [#215-218](https://github.com/marcosgenesis/tatamiq/issues/215-218)
* somes fixes ([408dead](https://github.com/marcosgenesis/tatamiq/commit/408deadbd5d4fcd6dbbe61c86ee89e0785cabb8a))
* **students:** add toast feedback on pre-registration approve/reject ([222a933](https://github.com/marcosgenesis/tatamiq/commit/222a93330e3be6db6469b956eccfe5f5b31a2edb))
* **students:** redesign Alunos list page ([#201](https://github.com/marcosgenesis/tatamiq/issues/201)-206) ([6ed2ba3](https://github.com/marcosgenesis/tatamiq/commit/6ed2ba35c2b7c17b5055d74b04f3166fea728bb1)), closes [#201-206](https://github.com/marcosgenesis/tatamiq/issues/201-206)
* **students:** redesign Novo aluno drawer in sections with belt visual and success toast ([#209](https://github.com/marcosgenesis/tatamiq/issues/209)-214) ([b7acfe8](https://github.com/marcosgenesis/tatamiq/commit/b7acfe89fc4af0a3aee27e7a27123bdd2f50200b)), closes [#209-214](https://github.com/marcosgenesis/tatamiq/issues/209-214)
* **students:** remove CSV export/import buttons from page header ([ea0bb49](https://github.com/marcosgenesis/tatamiq/commit/ea0bb4921a597d5ccd39786a29571c34fb871fe6))
* **students:** remove status filter tabs, fix CSV buttons in header ([67a576b](https://github.com/marcosgenesis/tatamiq/commit/67a576b930f6d74c759ed090e39cca8eae0b3afe))
* tatamiq pen ([247032a](https://github.com/marcosgenesis/tatamiq/commit/247032a92632ea8d0f77c6ddef9b1fae512f673e))
* throttle public pre-registration submissions ([#179](https://github.com/marcosgenesis/tatamiq/issues/179)) ([dbbdaf5](https://github.com/marcosgenesis/tatamiq/commit/dbbdaf521ddd46d3ac1b8cd18476ee926b67d0f5))


### Performance Improvements

* **web:** lazy load route bundles ([#191](https://github.com/marcosgenesis/tatamiq/issues/191)) ([ea71588](https://github.com/marcosgenesis/tatamiq/commit/ea71588d7991d1371b13ceba800991e6c877a9d5))

## [0.2.1](https://github.com/marcosgenesis/tatamiq/compare/v0.2.0...v0.2.1) (2026-06-16)


### Bug Fixes

* **api:** avoid express type dep in e2e r2 controller ([5cd7972](https://github.com/marcosgenesis/tatamiq/commit/5cd7972984fad1dc8279d298a73d3e967e2ff047))
* tests ([eb843bf](https://github.com/marcosgenesis/tatamiq/commit/eb843bf3b9831bb5b898b85871fa2d4847aad091))

# [0.2.0](https://github.com/marcosgenesis/tatamiq/compare/v0.1.0...v0.2.0) (2026-06-15)


### Bug Fixes

* **ui:** fix calendar grid class and month prop spreading ([993540d](https://github.com/marcosgenesis/tatamiq/commit/993540d3e6909d8938e7f99c646bd1f66872f8f0))


### Features

* **api,web:** add ZodBody decorator and refactor student form ([dfcbfdf](https://github.com/marcosgenesis/tatamiq/commit/dfcbfdf777a761c3bce6191c704ede669e7113ad))
* **class-groups,web:** add duplicate schedule validation and impeccabledd ([fd89fae](https://github.com/marcosgenesis/tatamiq/commit/fd89fae5b6926e2a00cc73531b31f1cbba6e1f73))
* **class-groups:** extract ClassGroupForm into dedicated file with reac ([0c0a1ce](https://github.com/marcosgenesis/tatamiq/commit/0c0a1ce4a9d3301cf87e0e53871d25804d2a5a78))
* **class-groups:** redesign form and page with improved UI ([71535c7](https://github.com/marcosgenesis/tatamiq/commit/71535c7de46510b9b229ca059cb1eb44225291fa))
* **class-groups:** show belt color badge in student picker ([0b65bba](https://github.com/marcosgenesis/tatamiq/commit/0b65bba185961ab54b62013391e79be9e096f177))
* **platform:** add SupportActionAuditInterceptor and extract pre-regist ([d52a255](https://github.com/marcosgenesis/tatamiq/commit/d52a2554a40dce21fb4b30931a93475d8c511c08))
* **platform:** move add admin form into a dialog modal ([fe465b5](https://github.com/marcosgenesis/tatamiq/commit/fe465b5ef3c7b0565eeffbbc0a09c18698cc83fb))
* **student-portal:** foundation — shell+FAB, BeltVisual, EmptyState, logic modules ([2555b72](https://github.com/marcosgenesis/tatamiq/commit/2555b7230515d46480922130c37a3e589b77c1a1)), closes [#139](https://github.com/marcosgenesis/tatamiq/issues/139)
* **student-portal:** graduação screen with belt hero, journey and timeline ([7d4a1cb](https://github.com/marcosgenesis/tatamiq/commit/7d4a1cb311db8c932e7f5575472a7f14bca9a149)), closes [#144](https://github.com/marcosgenesis/tatamiq/issues/144)
* **student-portal:** início screen with home hero and new-student empty ([1cb43ee](https://github.com/marcosgenesis/tatamiq/commit/1cb43eebe0088840f68d8f7af5b1078a06f57b51)), closes [#140](https://github.com/marcosgenesis/tatamiq/issues/140)
* **student-portal:** onboarding welcome flow ([7356c67](https://github.com/marcosgenesis/tatamiq/commit/7356c672217c7cb02b59dac9e5a4264daa7bb0b2)), closes [#147](https://github.com/marcosgenesis/tatamiq/issues/147)
* **student-portal:** presenças and agenda screens ([5f0c493](https://github.com/marcosgenesis/tatamiq/commit/5f0c493a37ec00fbed81f6104ecf2373c68152c7)), closes [#145](https://github.com/marcosgenesis/tatamiq/issues/145) [#141](https://github.com/marcosgenesis/tatamiq/issues/141)
* **student-portal:** redesign check-in flow with celebration and states ([61c15dc](https://github.com/marcosgenesis/tatamiq/commit/61c15dc0fa0b19184334b91c06a39efb23155e63)), closes [#142](https://github.com/marcosgenesis/tatamiq/issues/142)
* **student-portal:** redesign mensalidades with fee cards and empty state ([d1d9280](https://github.com/marcosgenesis/tatamiq/commit/d1d92802f542072e1d60647f30ea207d0a48e1d4)), closes [#143](https://github.com/marcosgenesis/tatamiq/issues/143)
* **student-portal:** redesign perfil with profile header and account list ([cffe98d](https://github.com/marcosgenesis/tatamiq/commit/cffe98d343f8f860d6374d53f7de8e5baa767695)), closes [#146](https://github.com/marcosgenesis/tatamiq/issues/146)
* **students,platform,seed:** add input validation and portal dev user ([b89531b](https://github.com/marcosgenesis/tatamiq/commit/b89531b768ae2014c04b81e1bacf3eb14eee74de))
* **web:** add Command component and refactor TagInput with cmdk ([c715638](https://github.com/marcosgenesis/tatamiq/commit/c71563860519b82cae2821580021da0cce3e8201))
* **web:** add DateTimeField, TimeField, TagInput components and refacto ([704068d](https://github.com/marcosgenesis/tatamiq/commit/704068d98f3c214552f5ad0874679d208ae779b3))

# [0.1.0](https://github.com/marcosgenesis/tatamiq/compare/v0.0.1...v0.1.0) (2026-06-15)


### Features

* tests e2e ([#175](https://github.com/marcosgenesis/tatamiq/issues/175)) ([4f86352](https://github.com/marcosgenesis/tatamiq/commit/4f863524993cbfbe920d7b90fe1c732e20a653bf)), closes [#139](https://github.com/marcosgenesis/tatamiq/issues/139) [#140](https://github.com/marcosgenesis/tatamiq/issues/140) [#144](https://github.com/marcosgenesis/tatamiq/issues/144) [#145](https://github.com/marcosgenesis/tatamiq/issues/145) [#141](https://github.com/marcosgenesis/tatamiq/issues/141) [#142](https://github.com/marcosgenesis/tatamiq/issues/142) [#146](https://github.com/marcosgenesis/tatamiq/issues/146) [#143](https://github.com/marcosgenesis/tatamiq/issues/143) [#147](https://github.com/marcosgenesis/tatamiq/issues/147) [#168](https://github.com/marcosgenesis/tatamiq/issues/168) [#150](https://github.com/marcosgenesis/tatamiq/issues/150) [#151](https://github.com/marcosgenesis/tatamiq/issues/151) [#169](https://github.com/marcosgenesis/tatamiq/issues/169) [#170](https://github.com/marcosgenesis/tatamiq/issues/170) [#173](https://github.com/marcosgenesis/tatamiq/issues/173) [#174](https://github.com/marcosgenesis/tatamiq/issues/174)

## [0.0.1](https://github.com/marcosgenesis/tatamiq/compare/v0.0.0...v0.0.1) (2026-06-14)


### Bug Fixes

* **web:** add svg titles for lint ([6d9938e](https://github.com/marcosgenesis/tatamiq/commit/6d9938e6e65a615b88b50a64d5a5236107b67504))

# Changelog

All notable changes to this project will be documented in this file.
