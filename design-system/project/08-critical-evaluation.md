# Critical Evaluation

ブリーフ§46のチェックリストに沿って、本Design Systemを自己批判的に検証する。

**UIがReadingより目立っていないか。** `ink-primary`を本文専用に予約し、Product Accentの`accent-greek-700`は選択状態・主要ボタンにのみ使う設計にしたことで、UIの主張は抑えられている。ただし`ReadingLocationBar`のTranslation/View Modeチップは、分離したことで逆に視覚的な要素数が1つ増えている——実装時に、チップの背景を`surface-sunken`程度の弱い差にとどめ、輪郭を強調しすぎないこと（Phase 1のUIレビューで確認すべき項目として`09`に記載）。

**Navigationが大きすぎないか。** Desktop Navigation Columnは既存構造を踏襲し拡張していないため、大きくなっていない。Bottom Navigationは既存の3項目から4項目に増やす提案をしており、増加自体はリスクである——ただし「本文」という非行き先の項目を削除した上での4項目化であり、実質的な情報量は増えていない（`02`§5）。

**ComparisonがResearch Tool化していないか。** Diff Highlighting・グリッド表示・複雑な比較コントロールを明示的にAvoidリストへ入れ、Translation A/B選択を1つの入口に集約したことで、Research的な「分析UI」への逸脱は抑えられている。今後の実装で、翻訳差分の統計・注釈機能などを安易に追加しないという運用上の規律が別途必要——Design Systemのトークンだけでは防ぎきれない領域である。

**MobileがDesktop縮小版になっていないか。** Mobile Comparisonを横並び2ペインではなくStacked Readingとして独立に設計した点、Bottom NavigationをApp-level destinationに限定した点は、縮小ではなく再設計である。一方、`ReadingModePicker`をモバイルでは複数ステップに分解する設計（`03`§5.6）は、デスクトップの1パネル完結UIより操作数が増える可能性があり、実装時にステップ数を3を超えないよう注意する必要がある。

**Mobile Comparisonが自然なReading Environmentになっているか。** Stacked Readingは「差分を探す画面」ではなく「2つの読書を縦に並べた画面」を目指した設計であり、既存の何もない状態（Comparison自体がモバイルで選べない）からの改善としては大きい。実際の自然さは、Verse間の余白（`space-7`）とTranslation切り替わりの視覚的な静かさ（罫線1本のみ）に大きく依存する——プロトタイプでの実読テストが必要（`09`参照）。

**Structural ReadingがTechnical Tool化していないか。** 既存実装の箱＋ラベルという表現自体がすでに「構文解析ツール」に見えるリスクを持っている。本Design SystemはFUNCTION層のみを既定で開き、CONSTRUCTION/MORPHOLOGYを段階的開示にすることでこれを緩和したが、STRUCTURE/CLAUSE_ROLE/RELATIONという3つのモードが並存すること自体、初見のユーザーには「分析ツールが3種類ある」ように映る可能性が残る——オンボーディングや初回ツールチップの設計は本Phaseのスコープ外だが、次フェーズの課題として明記する。

**情報密度が高すぎて読みにくくなっていないか／低すぎて意味を失っていないか。** Spacingトークンを「意味」に紐づけたこと（`05`§5, `tokens.json`のusage）で、密度の判断基準は個々のコンポーネント実装者に委ねられすぎない設計にはなった。ただしComparison中の`verse-ja-comparison`（16px/30px）は、単独読書の`verse-ja`（17px/34px）より確実に密度が上がる——長時間のComparison読書での疲労は、Single Readingほど検証できていない。

**ColorがDecoration化していないか／Greenが過剰使用されていないか。** `accent-greek-*`の使用箇所をREADMEで明示的に限定し、本文色に一切使わない設計にした。実装後、実際のスクリーンで「本のページを開いたときに緑が何箇所目に入るか」を数える簡易チェックを推奨する（目安：主要画面で2箇所以内）。

**Redが現在の緑版に不要に混入していないか。** `accent-hebrew-*`はトークンとして存在するが、README・コンポーネント仕様のいずれにも「現行UIでは使用しない」と明記した。トークンの存在そのものが混入のリスクになるため、実装時のLintルール等で`accent-hebrew-*`の使用を現行ビルドで検出・警告する仕組みを推奨する（`09`）。

**Componentが増えすぎていないか。** `06`で収録したのは8個、仕様のみが約12個——ブリーフ§34のリストに対して過不足なく対応させた。Toast、Avatarのような「一般的だが本製品に必要性のないコンポーネント」は意図的に含めていない（craft.mdの「source-defined inventory」原則にも合致）。

**Dashboard/SaaS的になっていないか。** カード型コンテナ、KPIパネル、過剰なバッジを使っていない。ただし`ReadingLocationBar`のチップ化は、実装が雑だとバッジ的に見えるリスクがあるため、§冒頭の指摘を再掲する。

**Religious clichéに寄っていないか。** 十字架・牧歌的装飾は一切使用していない。唯一の装飾的要素はStructural Readingの箱と線であり、これは分析目的の視覚言語であって宗教的意匠ではない。

**Greek/English/JapaneseがTypography上破綻していないか。** 3ファミリーを明確に分離し、Mixed-scriptを`lang`属性ベースで切り替える設計にした（`05`§3）。実装未検証のリスクとして、CSSフォールバックチェーンの実機（特にAndroid）でのレンダリング差異が残る——実機フォントレンダリングのQAが必要。

**将来Hebrewを追加できるDesign Systemになっているか。** `accent-hebrew-*`のトークン構造、`reading-source`ファミリーのHebrew対応方針、論理プロパティの推奨（`05`§7）など、赤版のための土台は用意した。ただし実際のHebrew文字組版（RTL、母音点の位置、行送り）は未検証であり、赤版着手時に専用のTypography検証フェーズが必要になる。

**Reading Positionが失われていないか。** `04`のState Transition Architectureで、Research・Comparison・Chapter Navigationいずれの遷移でもBible Location・Reading State・View Mode・Translation A/Bを保持する設計にした。実装の正しさは、この5項目をすべて含む1つの状態オブジェクトとして扱うかどうかに懸かっている——部分的な状態管理（例えばBible LocationだけをURLに、Reading StateだけをローカルStateに、と分散させる実装）は、意図せぬ喪失を招きやすいため、`09`で実装方針として明記する。

**ResearchがReadingから切断されていないか。** Panel/Overlay型の実装（別ルートを作らない）を明記したことで、切断のリスクは設計レベルでは低い。ただし既存実装に「元の聖書サイトを開く」という外部サイトへの導線が別途存在しており、これはResearchでもReadingでもない第3のパターン（離脱）である——本Design Systemのスコープでは変更を提案しないが、State Transition図には現れていないことを明記しておく。
