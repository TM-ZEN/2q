const SUPABASE_URL = 'https://xyqasgkkvfcrkmifmfvc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mvVA_oYgrrM8aGlj272Nog_lGyAHbff';
let supabaseClient = null;

function getUserId() {
    let userId = localStorage.getItem('study_app_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('study_app_user_id', userId);
    }
    return userId;
}

class StudyApp {
    constructor() {
        this.currentSubject = null;
        this.selectedChapters = [];
        this.allChapters = {};
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalQuestions = 0;
        this.isAnswered = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateUI();
    }

    bindEvents() {
        document.querySelectorAll('.subject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectSubject(e.target.dataset.subject);
            });
        });

        document.getElementById('select-all-chapters').addEventListener('click', () => {
            this.selectAllChapters();
        });

        document.getElementById('deselect-all-chapters').addEventListener('click', () => {
            this.deselectAllChapters();
        });

        document.getElementById('generate-questions').addEventListener('click', () => {
            this.generateQuestions();
        });

        document.getElementById('generate-prompt').addEventListener('click', () => {
            this.generatePrompt();
        });

        document.getElementById('import-questions').addEventListener('click', () => {
            this.showImportArea();
        });

        document.getElementById('copy-prompt').addEventListener('click', () => {
            this.copyPrompt();
        });

        document.getElementById('process-import').addEventListener('click', () => {
            this.processImport();
        });

        document.getElementById('start-quiz').addEventListener('click', () => {
            this.startQuiz();
        });

        document.getElementById('submit-answer').addEventListener('click', () => {
            this.submitAnswer();
        });

        document.getElementById('next-question').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('reset-progress').addEventListener('click', () => {
            this.resetProgress();
        });

        document.getElementById('show-questions').addEventListener('click', () => {
            this.showQuestionList();
        });

        document.getElementById('clear-subject-data').addEventListener('click', () => {
            this.clearSubjectData();
        });

        document.getElementById('manage-api-key').addEventListener('click', () => {
            this.manageAPIKey();
        });

        document.getElementById('debug-info').addEventListener('click', () => {
            this.showDebugInfo();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-data').addEventListener('click', () => {
            this.showDataImportArea();
        });

        document.getElementById('process-data-import').addEventListener('click', () => {
            this.processDataImport();
        });

        document.getElementById('set-user-id').addEventListener('click', () => {
            this.setUserId();
        });

        document.getElementById('save-to-cloud').addEventListener('click', () => {
            this.saveToCloud();
        });

        document.getElementById('load-from-cloud').addEventListener('click', () => {
            this.loadFromCloud();
        });

        document.getElementById('fill-blank-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });
    }

    selectSubject(subject) {
        this.currentSubject = subject;
        this.selectedChapters = [];

        document.querySelectorAll('.subject-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-subject="${subject}"]`).classList.add('active');

        this.loadChaptersForSubject(subject);
        this.updateUI();
    }

    async loadChaptersForSubject(subject) {
        try {
            const userId = getUserId();

            let query;
            if (chapterColumnExists) {
                query = supabaseClient
                    .from('study_data')
                    .select('chapter, questions, score, total_questions')
                    .eq('user_id', userId)
                    .eq('subject', subject)
                    .not('chapter', 'is', null);
            } else {
                query = supabaseClient
                    .from('study_data')
                    .select('questions, score, total_questions')
                    .eq('user_id', userId)
                    .eq('subject', subject);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (chapterColumnExists) {
                this.allChapters[subject] = data || [];
            } else {
                this.allChapters[subject] = (data || []).map(row => ({
                    ...row,
                    chapter: 'default'
                }));
            }

            this.displayChapterSelector();

        } catch (error) {
            console.error('チャプター読み込みエラー:', JSON.stringify(error, null, 2), error);
            this.allChapters[subject] = [];
            this.displayChapterSelector();
        }
    }

    displayChapterSelector() {
        const chapterSection = document.getElementById('chapter-section');
        const chapterSelector = document.getElementById('chapter-selector');

        if (!this.currentSubject) {
            chapterSection.classList.add('hidden');
            return;
        }

        const chapters = this.allChapters[this.currentSubject] || [];

        if (chapters.length === 0) {
            chapterSection.classList.add('hidden');
            return;
        }

        chapterSection.classList.remove('hidden');
        chapterSelector.innerHTML = '';

        chapters.forEach(chapterData => {
            const btn = document.createElement('button');
            btn.className = 'chapter-btn';
            btn.dataset.chapter = chapterData.chapter;

            const questionCount = chapterData.questions ? chapterData.questions.length : 0;
            const score = chapterData.score || 0;
            const total = chapterData.total_questions || 0;
            const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

            btn.innerHTML = `
                <div style="font-weight: bold;">チャプター ${chapterData.chapter}</div>
                <div class="chapter-info">問題数: ${questionCount} | 正解率: ${percentage}%</div>
            `;

            btn.addEventListener('click', () => {
                this.toggleChapter(chapterData.chapter);
            });

            chapterSelector.appendChild(btn);
        });
    }

    toggleChapter(chapter) {
        const index = this.selectedChapters.indexOf(chapter);
        if (index > -1) {
            this.selectedChapters.splice(index, 1);
        } else {
            this.selectedChapters.push(chapter);
        }

        this.updateChapterButtonStates();
        this.loadSelectedChaptersData();
        this.updateUI();
    }

    selectAllChapters() {
        const chapters = this.allChapters[this.currentSubject] || [];
        this.selectedChapters = chapters.map(c => c.chapter);
        this.updateChapterButtonStates();
        this.loadSelectedChaptersData();
        this.updateUI();
    }

    deselectAllChapters() {
        this.selectedChapters = [];
        this.updateChapterButtonStates();
        this.loadSelectedChaptersData();
        this.updateUI();
    }

    updateChapterButtonStates() {
        document.querySelectorAll('.chapter-btn').forEach(btn => {
            if (this.selectedChapters.includes(btn.dataset.chapter)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    async loadSelectedChaptersData() {
        if (this.selectedChapters.length === 0) {
            this.questions = [];
            this.score = 0;
            this.totalQuestions = 0;
            return;
        }

        try {
            const userId = getUserId();

            let query = supabaseClient
                .from('study_data')
                .select('*')
                .eq('user_id', userId)
                .eq('subject', this.currentSubject);

            if (chapterColumnExists) {
                query = query.in('chapter', this.selectedChapters);
            }

            const { data, error } = await query;
            if (error) throw error;

            this.questions = [];
            this.score = 0;
            this.totalQuestions = 0;

            data.forEach(chapterData => {
                if (chapterData.questions && chapterData.questions.length > 0) {
                    const chapterLabel = chapterColumnExists ? chapterData.chapter : 'default';
                    const questionsWithChapter = chapterData.questions.map(q => ({
                        ...q,
                        chapter: chapterLabel
                    }));
                    this.questions = [...this.questions, ...questionsWithChapter];
                }
                this.score += chapterData.score || 0;
                this.totalQuestions += chapterData.total_questions || 0;
            });

        } catch (error) {
            console.error('チャプターデータ読み込みエラー:', JSON.stringify(error, null, 2), error);
        }
    }

    updateUI() {
        if (!this.currentSubject) {
            document.getElementById('generate-section').classList.add('hidden');
            document.getElementById('study-section').classList.add('hidden');
            document.getElementById('management-section').classList.add('hidden');
            document.getElementById('chapter-section').classList.add('hidden');
            return;
        }

        document.getElementById('generate-section').classList.remove('hidden');
        document.getElementById('management-section').classList.remove('hidden');

        if (this.selectedChapters.length > 0) {
            document.getElementById('study-section').classList.remove('hidden');
            document.getElementById('score').textContent = this.score;
            document.getElementById('total').textContent = this.totalQuestions;
            const percentage = this.totalQuestions > 0 ? Math.round((this.score / this.totalQuestions) * 100) : 0;
            document.getElementById('percentage').textContent = percentage;

            const progress = this.totalQuestions > 0 ? (this.score / this.totalQuestions) * 100 : 0;
            document.getElementById('progress-fill').style.width = `${progress}%`;
        } else {
            document.getElementById('study-section').classList.add('hidden');
        }

        document.getElementById('question-count').textContent = this.questions.length;
        this.updateUserIdDisplay();
    }

    updateUserIdDisplay() {
        const currentUserId = getUserId();
        document.getElementById('current-user-id').textContent = currentUserId;
    }

    async generateQuestions() {
        const memo = document.getElementById('memo-input').value.trim();
        const chapterName = document.getElementById('chapter-name-input').value.trim();

        if (!memo) {
            alert('授業メモを入力してください。');
            return;
        }

        if (!chapterName) {
            alert('チャプター名を入力してください。');
            return;
        }

        let apiKey = localStorage.getItem('anthropic_api_key');
        if (!apiKey) {
            apiKey = prompt('Anthropic APIキーを入力してください（今後のために保存されます）:');
            if (!apiKey) {
                alert('APIキーが必要です。');
                return;
            }
            localStorage.setItem('anthropic_api_key', apiKey);
        }

        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('generate-questions').disabled = true;

        try {
            const questions = await this.callClaudeAPI(memo, apiKey);
            await this.saveChapterData(chapterName, questions);
            await this.loadChaptersForSubject(this.currentSubject);

            document.getElementById('memo-input').value = '';
            document.getElementById('chapter-name-input').value = '';
            alert(`チャプター「${chapterName}」の問題を生成しました！`);

        } catch (error) {
            console.error('API Error:', JSON.stringify(error, null, 2), error);
            if (confirm('AI API接続でエラーが発生しました。サンプル問題で代替しますか？')) {
                const sampleQuestions = this.generateSampleQuestions(memo);
                await this.saveChapterData(chapterName, sampleQuestions);
                await this.loadChaptersForSubject(this.currentSubject);

                document.getElementById('memo-input').value = '';
                document.getElementById('chapter-name-input').value = '';
                alert(`チャプター「${chapterName}」のサンプル問題を生成しました！`);
            }
        } finally {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('generate-questions').disabled = false;
        }
    }

    async saveChapterData(chapterName, questions) {
        try {
            const userId = getUserId();

            let fetchQuery = supabaseClient
                .from('study_data')
                .select('questions, score, total_questions')
                .eq('user_id', userId)
                .eq('subject', this.currentSubject);

            if (chapterColumnExists) {
                fetchQuery = fetchQuery.eq('chapter', chapterName);
            }
            fetchQuery = fetchQuery.single();

            const { data: existingData, error: fetchError } = await fetchQuery;

            let allQuestions = questions;
            let currentScore = 0;
            let currentTotal = 0;

            if (existingData && existingData.questions && existingData.questions.length > 0) {
                allQuestions = [...existingData.questions, ...questions];
                currentScore = existingData.score || 0;
                currentTotal = existingData.total_questions || 0;
            }

            const data = {
                user_id: userId,
                subject: this.currentSubject,
                questions: allQuestions,
                score: currentScore,
                total_questions: currentTotal,
                updated_at: new Date().toISOString()
            };

            if (chapterColumnExists) {
                data.chapter = chapterName;
            }

            const conflictColumns = chapterColumnExists
                ? 'user_id,subject,chapter'
                : 'user_id,subject';

            const { error } = await supabaseClient
                .from('study_data')
                .upsert(data, { onConflict: conflictColumns });

            if (error) throw error;

            const isAddition = existingData && existingData.questions && existingData.questions.length > 0;
            const message = isAddition
                ? `チャプター「${chapterName}」に${questions.length}問を追加しました！（合計: ${allQuestions.length}問）`
                : `チャプター「${chapterName}」に${questions.length}問を保存しました！`;

            return { isAddition, totalQuestions: allQuestions.length, message };

        } catch (error) {
            console.error('チャプターデータ保存エラー:', JSON.stringify(error, null, 2), error);
            alert('データ保存でエラーが発生しました: ' + (error.message || JSON.stringify(error)));
            throw error;
        }
    }

    generateSampleQuestions(memo) {
        const sampleQuestions = [];
        const words = memo.split(/\s+/).filter(word => word.length > 2);

        for (let i = 0; i < Math.min(15, words.length); i++) {
            const word = words[i];
            if (i % 2 === 0) {
                sampleQuestions.push({
                    type: 'multiple',
                    question: `「${word}」について正しい説明はどれですか？`,
                    options: [
                        `${word}は重要な概念である`,
                        `${word}は関係のない要素である`,
                        `${word}は古い理論である`,
                        `${word}は間違った考え方である`
                    ],
                    correctAnswer: 0
                });
            } else {
                sampleQuestions.push({
                    type: 'fillblank',
                    question: `授業で学んだ重要な概念「____」について説明してください。`,
                    correctAnswer: word
                });
            }
        }
        return sampleQuestions;
    }

    async callClaudeAPI(memo, apiKey) {
        const apiUrl = 'https://api.anthropic.com/v1/messages';

        const prompt = `あなたは認知科学に基づく学習教材の設計者です。
以下の授業メモから、長期記憶への定着を最大化する一問一答を16問作成してください。
目的は「単語の暗記」ではなく「検索練習による概念理解の強化」です。

# 出題対象の選び方
- メモの中の「核心概念・原理・因果関係」を優先し、瑣末な数値や固有名詞だけの暗記は避ける。
- 1問につき1概念のみを問う。
- メモに書かれている内容のみを根拠とし、推測で事実を補わない。

# 問題形式の配分（合計16問）
- 穴埋め（自力想起）: 8問
- 4択（再認）: 8問
- 16問中、最低4問は「理由・比較・適用」を問う問題にする。

# 4択の誤答ルール【最重要】
- 誤答は「ありがちな誤解」「似て非なる概念」「文脈違い」に基づき、もっともらしく作る。
- 4択は長さ・粒度・文体をそろえ、正解だけが目立たないようにする。

# 穴埋めのルール
- 空欄は概念の意味を担う中心語句にする。語数から答えが推測できないようにする。

# 各問に必須のフィールド
- explanation: 正解の理由（4択は誤答がなぜ誤りかも簡潔に）。
- cognitiveLevel: "recall" / "understand" / "apply" のいずれか。
- difficulty: 1〜3の整数。

# 数式・記号の表記ルール
- 数式・変数・ギリシャ文字を含む場合は LaTeX 記法で記述し、$...$ で囲む。
  （例: θ → $\\theta$、f_θ(x) → $f_{\\theta}(x)$、(1/N)Σ(ŷ-y)² → $\\frac{1}{N}\\sum_{n}(\\hat{y}_n - y_n)^2$）
- 日本語の説明文中に数式が混在する場合も同様に $...$ で囲む。
- 数式でない一般的な日本語テキストには LaTeX を使わない。

授業メモ:
${memo}

JSONのみで回答してください（説明文は不要）:
[
  {
    "type": "multiple",
    "question": "問題文",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correctAnswer": 0,
    "explanation": "正解の理由。各誤答がなぜ誤りか。",
    "cognitiveLevel": "understand",
    "difficulty": 2
  },
  {
    "type": "fillblank",
    "question": "____に入る語句は何ですか？",
    "correctAnswer": "正解の語句",
    "explanation": "なぜその語句が入るのかの理由。",
    "cognitiveLevel": "recall",
    "difficulty": 1
  }
]`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API Error ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        const content = data.content[0].text;

        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        } else {
            const arrayMatch = content.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                jsonStr = arrayMatch[0];
            }
        }

        try {
            return JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('JSON Parse Error:', JSON.stringify(parseError, null, 2), parseError);
            throw new Error('Claude APIの応答をJSONとして解析できませんでした');
        }
    }

    generatePrompt() {
        const memo = document.getElementById('memo-input').value.trim();
        const chapterName = document.getElementById('chapter-name-input').value.trim();

        if (!memo) {
            alert('授業メモを入力してください。');
            return;
        }

        if (!chapterName) {
            alert('チャプター名を入力してください。');
            return;
        }

        const prompt = `あなたは認知科学に基づく学習教材の設計者です。
以下の授業メモから、長期記憶への定着を最大化する一問一答を16問作成してください。
目的は「単語の暗記」ではなく「検索練習による概念理解の強化」です。

# 出題対象の選び方
- メモの中の「核心概念・原理・因果関係」を優先し、瑣末な数値や固有名詞だけの暗記は避ける。
- 1問につき1概念のみを問う（複数概念を1問に詰め込まない）。
- メモに書かれている内容のみを根拠とし、推測で事実を補わない。

# 問題形式の配分（合計16問）
- 穴埋め（自力想起）: 8問
- 4択（再認）: 8問
- さらに16問中、最低4問は「理由・比較・適用」を問う問題にする
  （例:「なぜAではなくBが起きるか」「AとBの違いは何か」「この原理が当てはまる例はどれか」）

# 4択問題の誤答（ダミー選択肢）の品質ルール【最重要】
- 誤答は「ありがちな誤解」「似て非なる概念」「文脈違い」に基づいて作る。
- 4つの選択肢は長さ・粒度・文体をそろえ、正解だけが目立たないようにする。
- 「すべて正しい」「上記のいずれでもない」は使わない。

# 穴埋め問題のルール
- 空欄は、その概念の意味を担う中心語句にする（助詞や一般語を抜かない）。
- 空欄の語数や長さから答えが推測できないようにする。

# 各問に必須のフィールド
- explanation: 正解の理由を1〜2文で。4択の場合は「なぜ各誤答を選びがちか／なぜ誤りか」も簡潔に含める。
- cognitiveLevel: "recall"（想起）/ "understand"（理解）/ "apply"（適用）のいずれか。
- difficulty: 1（易）〜3（難）の整数。

# 数式・記号の表記ルール
- 数式・変数・ギリシャ文字を含む場合は LaTeX 記法で記述し、$...$ で囲む。
  （例: θ → $\\theta$、f_θ(x) → $f_{\\theta}(x)$、(1/N)Σ(ŷ-y)² → $\\frac{1}{N}\\sum_{n}(\\hat{y}_n - y_n)^2$）
- 日本語の説明文中に数式が混在する場合も同様に $...$ で囲む。
- 数式でない一般的な日本語テキストには LaTeX を使わない。

# 出力に関する厳守事項
- 成果物はartifactやコードブロックではなく、チャット本文に直接プレーンテキストとして出力する。
- 回答はJSON配列のみとし、前後に説明文・見出し・コードフェンスを一切付けない。
- ファイル生成・artifact化は行わない。1個のJSON配列のテキストだけを返す。

対象チャプター: ${chapterName}
授業メモ:
${memo}

必ず以下のJSON形式のみで回答してください（説明文や追加のテキストは一切不要）:
[
  {
    "type": "multiple",
    "question": "問題文",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correctAnswer": 0,
    "explanation": "正解の理由。各誤答がなぜ誤りか・選びやすいか。",
    "cognitiveLevel": "understand",
    "difficulty": 2
  },
  {
    "type": "fillblank",
    "question": "____に入る語句は何ですか？",
    "correctAnswer": "正解の語句",
    "explanation": "なぜその語句が入るのかの理由。",
    "cognitiveLevel": "recall",
    "difficulty": 1
  }
]`;

        document.getElementById('prompt-text').value = prompt;
        document.getElementById('prompt-display').classList.remove('hidden');
        document.getElementById('import-area').classList.add('hidden');
    }

    copyPrompt() {
        const promptText = document.getElementById('prompt-text');
        promptText.select();
        document.execCommand('copy');
        alert('プロンプトをコピーしました！Claude AIに貼り付けて実行してください。');
    }

    showImportArea() {
        document.getElementById('import-area').classList.remove('hidden');
        document.getElementById('prompt-display').classList.add('hidden');
    }

    processImport() {
        const importText = document.getElementById('import-text').value.trim();
        const chapterName = document.getElementById('chapter-name-input').value.trim();

        if (!importText) {
            alert('Claude AIの回答を貼り付けてください。');
            return;
        }

        if (!chapterName) {
            alert('チャプター名を入力してください。');
            return;
        }

        try {
            let jsonStr = importText;
            const jsonMatch = importText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            } else {
                const arrayMatch = importText.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    jsonStr = arrayMatch[0];
                }
            }

            const questions = JSON.parse(jsonStr);

            if (!Array.isArray(questions)) {
                throw new Error('問題は配列形式である必要があります');
            }

            for (const q of questions) {
                if (!q.type || !q.question) {
                    throw new Error('問題にtype, questionが必要です');
                }
                if (q.type === 'multiple' && (!q.options || !q.hasOwnProperty('correctAnswer'))) {
                    throw new Error('選択肢問題にはoptions, correctAnswerが必要です');
                }
                if (q.type === 'fillblank' && !q.correctAnswer) {
                    throw new Error('穴埋め問題にはcorrectAnswerが必要です');
                }
                q.explanation = (typeof q.explanation === 'string') ? q.explanation : '';
                q.cognitiveLevel = ['recall', 'understand', 'apply'].includes(q.cognitiveLevel)
                    ? q.cognitiveLevel : 'recall';
                q.difficulty = [1, 2, 3].includes(q.difficulty) ? q.difficulty : 1;
            }

            this.saveChapterData(chapterName, questions).then((result) => {
                this.loadChaptersForSubject(this.currentSubject);

                document.getElementById('memo-input').value = '';
                document.getElementById('chapter-name-input').value = '';
                document.getElementById('import-text').value = '';
                document.getElementById('import-area').classList.add('hidden');
                document.getElementById('prompt-display').classList.add('hidden');

                alert(result.message);
            });

        } catch (error) {
            alert(`インポートエラー: ${error.message}\n\nJSON形式が正しいか確認してください。`);
        }
    }

    startQuiz() {
        if (this.selectedChapters.length === 0) {
            alert('学習するチャプターを選択してください。');
            return;
        }
        if (this.questions.length === 0) {
            alert('選択されたチャプターに問題がありません。');
            return;
        }
        this.currentQuestionIndex = 0;
        this.isAnswered = false;
        document.getElementById('quiz-section').style.display = 'block';
        this.showQuestion();
    }

    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endQuiz();
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        const questionEl = document.getElementById('question-text');
        questionEl.innerHTML =
            `問題 ${this.currentQuestionIndex + 1}/${this.questions.length}: ${this.renderMath(question.question)}`;

        const metaEl = document.getElementById('question-meta');
        const levelLabels = { recall: '想起', understand: '理解', apply: '適用' };
        const diffLabels = { 1: '易', 2: '中', 3: '難' };
        const badges = [];
        if (this.selectedChapters.length > 0) {
            badges.push(`<span class="meta-badge">チャプター ${this.selectedChapters.join('・')}</span>`);
        }
        if (question.cognitiveLevel && levelLabels[question.cognitiveLevel]) {
            badges.push(`<span class="meta-badge">${levelLabels[question.cognitiveLevel]}</span>`);
        }
        if (question.difficulty && diffLabels[question.difficulty]) {
            badges.push(`<span class="meta-badge">難易度: ${diffLabels[question.difficulty]}</span>`);
        }
        metaEl.innerHTML = badges.join('');

        const optionsContainer = document.getElementById('options-container');
        const fillBlankInput = document.getElementById('fill-blank-input');
        const submitBtn = document.getElementById('submit-answer');
        const nextBtn = document.getElementById('next-question');
        const feedbackBox = document.getElementById('feedback-box');

        optionsContainer.innerHTML = '';
        fillBlankInput.classList.add('hidden');
        submitBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
        feedbackBox.classList.add('hidden');
        feedbackBox.classList.remove('correct', 'incorrect');
        feedbackBox.innerHTML = '';
        this.isAnswered = false;

        if (question.type === 'multiple') {
            question.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerHTML = this.renderMath(option);
                btn.addEventListener('click', () => this.selectOption(index, btn));
                optionsContainer.appendChild(btn);
            });
        } else if (question.type === 'fillblank') {
            fillBlankInput.classList.remove('hidden');
            fillBlankInput.value = '';
            fillBlankInput.removeAttribute('disabled');
            submitBtn.classList.remove('hidden');
        }
    }

    async selectOption(index, btnElement) {
        if (this.isAnswered) return;
        const question = this.questions[this.currentQuestionIndex];
        const correct = index === question.correctAnswer;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.style.pointerEvents = 'none';
        });

        if (correct) {
            btnElement.classList.add('correct');
            this.score++;
        } else {
            btnElement.classList.add('incorrect');
            document.querySelectorAll('.option-btn')[question.correctAnswer].classList.add('correct');
        }

        this.totalQuestions++;
        this.isAnswered = true;
        this.showFeedback(question, correct);
        await this.updateChapterScore(question.chapter, correct);
        this.updateUI();
        document.getElementById('next-question').classList.remove('hidden');
    }

    async submitAnswer() {
        if (this.isAnswered) return;
        const userAnswer = document.getElementById('fill-blank-input').value.trim();
        const question = this.questions[this.currentQuestionIndex];

        if (!userAnswer) {
            alert('答えを入力してください。');
            return;
        }

        const correct = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
        if (correct) {
            this.score++;
        }

        this.totalQuestions++;
        this.isAnswered = true;
        this.showFeedback(question, correct, userAnswer);
        await this.updateChapterScore(question.chapter, correct);
        this.updateUI();

        document.getElementById('fill-blank-input').setAttribute('disabled', 'true');
        document.getElementById('submit-answer').classList.add('hidden');
        document.getElementById('next-question').classList.remove('hidden');
    }

    showFeedback(question, correct, userAnswer) {
        const box = document.getElementById('feedback-box');
        box.classList.remove('hidden', 'correct', 'incorrect');
        box.classList.add(correct ? 'correct' : 'incorrect');

        let correctText = '';
        if (question.type === 'fillblank') {
            correctText = question.correctAnswer;
        } else if (question.type === 'multiple' && Array.isArray(question.options)) {
            correctText = question.options[question.correctAnswer];
        }

        const parts = [];
        parts.push(`<div class="feedback-verdict">${correct ? '正解' : '不正解'}</div>`);
        if (!correct && correctText) {
            parts.push(`<div class="feedback-answer">正解: ${this.renderMath(correctText)}</div>`);
        }
        if (question.explanation) {
            parts.push(`<div class="feedback-explanation">${this.renderMath(question.explanation)}</div>`);
        }
        box.innerHTML = parts.join('');
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // $...$ で囲まれた部分をKaTeXでレンダリングし、それ以外はescapeHtmlで処理する
    renderMath(str) {
        const parts = String(str).split(/(\$[^$]+\$)/g);
        return parts.map(part => {
            if (part.startsWith('$') && part.endsWith('$')) {
                const latex = part.slice(1, -1);
                try {
                    return katex.renderToString(latex, { throwOnError: false });
                } catch (e) {
                    return this.escapeHtml(part);
                }
            }
            return this.escapeHtml(part);
        }).join('');
    }

    async updateChapterScore(chapter, isCorrect) {
        try {
            const userId = getUserId();

            let fetchQuery = supabaseClient
                .from('study_data')
                .select('score, total_questions')
                .eq('user_id', userId)
                .eq('subject', this.currentSubject);
            if (chapterColumnExists) {
                fetchQuery = fetchQuery.eq('chapter', chapter);
            }
            const { data, error: fetchError } = await fetchQuery.single();
            if (fetchError) throw fetchError;

            const newScore = (data.score || 0) + (isCorrect ? 1 : 0);
            const newTotal = (data.total_questions || 0) + 1;

            let updateQuery = supabaseClient
                .from('study_data')
                .update({
                    score: newScore,
                    total_questions: newTotal,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('subject', this.currentSubject);
            if (chapterColumnExists) {
                updateQuery = updateQuery.eq('chapter', chapter);
            }
            const { error: updateError } = await updateQuery;
            if (updateError) throw updateError;
        } catch (error) {
            console.error('スコア更新エラー:', JSON.stringify(error, null, 2), error);
        }
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        this.showQuestion();
    }

    endQuiz() {
        document.getElementById('quiz-section').style.display = 'none';
        const percentage = Math.round((this.score / this.totalQuestions) * 100);
        alert(`学習完了！正解率: ${percentage}%`);
    }

    resetProgress() {
        if (this.selectedChapters.length === 0) {
            alert('チャプターを選択してください。');
            return;
        }
        if (confirm(`選択されたチャプターの進捗をリセットしますか？`)) {
            this.resetSelectedChaptersProgress();
        }
    }

    async resetSelectedChaptersProgress() {
        try {
            const userId = getUserId();

            if (chapterColumnExists) {
                for (const chapter of this.selectedChapters) {
                    const { error } = await supabaseClient
                        .from('study_data')
                        .update({
                            score: 0,
                            total_questions: 0,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .eq('subject', this.currentSubject)
                        .eq('chapter', chapter);
                    if (error) throw error;
                }
            } else {
                const { error } = await supabaseClient
                    .from('study_data')
                    .update({
                        score: 0,
                        total_questions: 0,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId)
                    .eq('subject', this.currentSubject);
                if (error) throw error;
            }
            await this.loadSelectedChaptersData();
            await this.loadChaptersForSubject(this.currentSubject);
            this.updateUI();
            alert('選択されたチャプターの進捗をリセットしました。');
        } catch (error) {
            console.error('進捗リセットエラー:', JSON.stringify(error, null, 2), error);
            alert('進捗リセットでエラーが発生しました: ' + error.message);
        }
    }

    showQuestionList() {
        const listElement = document.getElementById('question-list');
        if (listElement.classList.contains('hidden')) {
            listElement.innerHTML = '';
            this.questions.forEach((q, index) => {
                const item = document.createElement('div');
                item.className = 'question-item';
                const chapterInfo = q.chapter ? ` [チャプター ${q.chapter}]` : '';
                item.innerHTML = `
                    <strong>Q${index + 1}${chapterInfo}:</strong> ${q.question}
                    <button class="delete-btn" onclick="app.deleteQuestion(${index})">削除</button>
                `;
                listElement.appendChild(item);
            });
            listElement.classList.remove('hidden');
        } else {
            listElement.classList.add('hidden');
        }
    }

    deleteQuestion(index) {
        if (confirm('この問題を削除しますか？')) {
            this.questions.splice(index, 1);
            this.updateUI();
            this.showQuestionList();
        }
    }

    clearSubjectData() {
        if (confirm(`${this.currentSubject}のすべてのチャプターデータを削除しますか？`)) {
            this.clearAllChaptersData();
        }
    }

    async clearAllChaptersData() {
        try {
            const userId = getUserId();
            const { error } = await supabaseClient
                .from('study_data')
                .delete()
                .eq('user_id', userId)
                .eq('subject', this.currentSubject);
            if (error) throw error;

            this.selectedChapters = [];
            this.allChapters[this.currentSubject] = [];
            this.questions = [];
            this.score = 0;
            this.totalQuestions = 0;
            this.updateUI();
            this.displayChapterSelector();
            document.getElementById('question-list').classList.add('hidden');
            alert(`${this.currentSubject}のすべてのデータを削除しました。`);
        } catch (error) {
            console.error('データ削除エラー:', JSON.stringify(error, null, 2), error);
            alert('データ削除でエラーが発生しました: ' + error.message);
        }
    }

    manageAPIKey() {
        const currentKey = localStorage.getItem('anthropic_api_key');
        let message = 'Anthropic APIキー管理\n\n';
        if (currentKey) {
            message += `現在のキー: ${currentKey.substring(0, 10)}...\n\n`;
            message += '1. 新しいキーを入力\n2. キーを削除\n3. キャンセル';
            const choice = prompt(message + '\n\n選択してください (1/2/3):');
            if (choice === '1') {
                const newKey = prompt('新しいAnthropic APIキーを入力してください:');
                if (newKey) {
                    localStorage.setItem('anthropic_api_key', newKey);
                    alert('APIキーを更新しました。');
                }
            } else if (choice === '2') {
                if (confirm('APIキーを削除しますか？')) {
                    localStorage.removeItem('anthropic_api_key');
                    alert('APIキーを削除しました。');
                }
            }
        } else {
            const newKey = prompt('Anthropic APIキーを入力してください:');
            if (newKey) {
                localStorage.setItem('anthropic_api_key', newKey);
                alert('APIキーを保存しました。');
            }
        }
    }

    showDebugInfo() {
        const apiKey = localStorage.getItem('anthropic_api_key');
        let debug = '=== デバッグ情報 ===\n\n';
        debug += `現在の科目: ${this.currentSubject || 'なし'}\n`;
        debug += `選択されたチャプター: ${this.selectedChapters.join(', ') || 'なし'}\n`;
        debug += `APIキー: ${apiKey ? `設定済み (${apiKey.substring(0, 10)}...)` : '未設定'}\n`;
        debug += `問題数: ${this.questions.length}\n`;
        debug += `正解/総問題: ${this.score}/${this.totalQuestions}\n`;
        debug += `画面幅: ${window.innerWidth}px\n`;
        debug += `ユーザーエージェント: ${navigator.userAgent.includes('Mobile') ? 'モバイル' : 'デスクトップ'}\n\n`;
        debug += '=== UI表示状態 ===\n';
        debug += `generate-section: ${document.getElementById('generate-section').classList.contains('hidden') ? '非表示' : '表示'}\n`;
        debug += `study-section: ${document.getElementById('study-section').classList.contains('hidden') ? '非表示' : '表示'}\n`;
        debug += `chapter-section: ${document.getElementById('chapter-section').classList.contains('hidden') ? '非表示' : '表示'}\n`;
        debug += `management-section: ${document.getElementById('management-section').classList.contains('hidden') ? '非表示' : '表示'}\n\n`;
        debug += '=== チャプター情報 ===\n';
        if (this.currentSubject && this.allChapters[this.currentSubject]) {
            this.allChapters[this.currentSubject].forEach(chapter => {
                debug += `${chapter.chapter}: ${chapter.questions ? chapter.questions.length : 0}問\n`;
            });
        }
        alert(debug);
    }

    async saveToCloud() {
        try {
            const button = document.getElementById('save-to-cloud');
            button.disabled = true;
            button.textContent = '保存中...';
            const userId = getUserId();
            let migratedCount = 0;
            for (const subject of ['kagaku', 'projectmanagement', 'kigyoukeiei', 'gender', 'deeplearning']) {
                const key = `study_app_${subject}`;
                const localData = localStorage.getItem(key);
                if (localData) {
                    const parsedData = JSON.parse(localData);
                    if (parsedData.questions && parsedData.questions.length > 0) {
                        const chapterName = `移行データ - ${new Date().toLocaleDateString()}`;
                        const data = {
                            user_id: userId,
                            subject: subject,
                            chapter: chapterName,
                            questions: parsedData.questions,
                            score: parsedData.score || 0,
                            total_questions: parsedData.totalQuestions || 0,
                            updated_at: new Date().toISOString()
                        };
                        const { error } = await supabaseClient
                            .from('study_data')
                            .upsert(data, { onConflict: 'user_id,subject,chapter' });
                        if (error) throw error;
                        migratedCount++;
                        localStorage.removeItem(key);
                    }
                }
            }
            if (migratedCount > 0) {
                alert(`データ移行完了！${migratedCount}科目のレガシーデータをクラウドに移行しました。`);
            } else {
                alert('データは既にクラウドに保存されています。');
            }
        } catch (error) {
            console.error('保存エラー:', JSON.stringify(error, null, 2), error);
            alert('保存でエラーが発生しました: ' + error.message);
        } finally {
            const button = document.getElementById('save-to-cloud');
            button.disabled = false;
            button.textContent = '📤 クラウドに保存';
        }
    }

    async loadFromCloud() {
        try {
            const button = document.getElementById('load-from-cloud');
            button.disabled = true;
            button.textContent = '読み込み中...';
            const userId = getUserId();
            const { data, error } = await supabaseClient
                .from('study_data')
                .select('*')
                .eq('user_id', userId);
            if (error) throw error;
            if (data.length === 0) {
                alert('クラウドにデータが見つかりませんでした。\n\n先に他のデバイスで問題を作成してください。');
                return;
            }
            if (this.currentSubject) {
                await this.loadChaptersForSubject(this.currentSubject);
                this.updateUI();
            }
            alert(`クラウド読み込み完了！${data.length}件のチャプターデータを読み込みました。\n\n科目とチャプターを選択して学習を開始してください。`);
        } catch (error) {
            console.error('読み込みエラー:', JSON.stringify(error, null, 2), error);
            alert('読み込みでエラーが発生しました: ' + error.message);
        } finally {
            const button = document.getElementById('load-from-cloud');
            button.disabled = false;
            button.textContent = '📥 クラウドから読み込み';
        }
    }

    exportData() {
        alert('新しいバージョンでは、データは自動的にクラウドに保存されます。\n「📥 クラウドから読み込み」を使用して他のデバイスでデータを同期してください。');
    }

    showDataImportArea() {
        alert('新しいバージョンでは、「📥 クラウドから読み込み」を使用してデータを同期してください。');
    }

    processDataImport() {
        alert('新しいバージョンでは、「📥 クラウドから読み込み」を使用してデータを同期してください。');
    }

    setUserId() {
        const newUserId = document.getElementById('user-id-input').value.trim();
        if (!newUserId) {
            alert('ユーザーIDを入力してください。');
            return;
        }
        if (newUserId.length < 3) {
            alert('ユーザーIDは3文字以上で入力してください。');
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(newUserId)) {
            alert('ユーザーIDは英数字、ハイフン、アンダースコアのみ使用できます。');
            return;
        }
        const currentUserId = localStorage.getItem('study_app_user_id');
        if (currentUserId && currentUserId !== newUserId) {
            if (!confirm(`現在のユーザーID「${currentUserId}」を「${newUserId}」に変更しますか？\n\n注意: 変更後はクラウド同期でデータを再取得する必要があります。`)) {
                return;
            }
        }
        localStorage.setItem('study_app_user_id', newUserId);
        this.updateUserIdDisplay();
        document.getElementById('user-id-input').value = '';
        alert(`ユーザーIDを「${newUserId}」に設定しました！\n\n他のデバイスでも同じIDを設定してクラウド同期を行ってください。`);
    }
}

// --- 初期化 ---

let chapterColumnExists = true;

async function checkTableColumns() {
    try {
        const { data, error } = await supabaseClient
            .from('study_data')
            .select('*')
            .limit(1);
        if (error) {
            console.warn('カラム確認クエリエラー:', JSON.stringify(error));
            chapterColumnExists = false;
            return;
        }
        if (data && data.length > 0) {
            chapterColumnExists = 'chapter' in data[0];
            console.log('chapter列存在確認:', chapterColumnExists, 'カラム:', Object.keys(data[0]));
        } else {
            console.warn('study_dataテーブルにデータが0件。chapter列存在は不明。');
            chapterColumnExists = false;
        }
    } catch (e) {
        console.error('カラム確認エラー:', JSON.stringify(e), e);
        chapterColumnExists = false;
    }
}

function initSupabase() {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                fetch: (...args) => fetch(...args)
            }
        });
        console.log('Supabase初期化完了');
        checkTableColumns().then(() => {
            console.log('chapterColumnExists:', chapterColumnExists);
            window.app = new StudyApp();
        });
    } else {
        console.warn('Supabase CDN未読み込み。再試行中...');
        setTimeout(initSupabase, 200);
    }
}

document.addEventListener('DOMContentLoaded', initSupabase);
