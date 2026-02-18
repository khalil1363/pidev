import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluationApiService, Evaluation, EvaluationAttempt, Question, Option } from '../../core/services/evaluation-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-take-evaluation',
  templateUrl: './take-evaluation.component.html',
  styleUrls: ['./take-evaluation.component.css']
})
export class TakeEvaluationComponent implements OnInit {
  evaluationId!: number;
  evaluation: Evaluation | null = null;
  attempt: EvaluationAttempt | null = null;
  questions: Question[] = [];
  currentIndex = 0;
  loading = true;
  submitting = false;
  finishing = false;

  answers: Map<number, { textAnswer?: string; selectedOptions?: Option[] }> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: EvaluationApiService,
    private currentUser: CurrentUserService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.evaluationId = +this.route.snapshot.paramMap.get('id')!;
    this.loadEvaluation();
  }

  loadEvaluation(): void {
    this.loading = true;
    this.api.getEvaluation(this.evaluationId).subscribe({
      next: (e) => {
        this.evaluation = e;
        this.questions = (e.questions || []).sort((a, b) => (a.questionOrder ?? 0) - (b.questionOrder ?? 0));
        this.startOrResumeAttempt();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load evaluation', 'Close', { duration: 3000 });
      }
    });
  }

  startOrResumeAttempt(): void {
    const userId = this.currentUser.getUserId();
    this.api.startAttempt(this.evaluationId, userId).subscribe({
      next: (a) => {
        this.attempt = a;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || err?.message || 'Cannot start attempt';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        this.router.navigate(['/frontoffice/evaluations']);
      }
    });
  }

  get currentQuestion(): Question | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get progress(): number {
    return this.questions.length ? ((this.currentIndex + 1) / this.questions.length) * 100 : 0;
  }

  selectOptionMCQ(opt: Option): void {
    const q = this.currentQuestion;
    if (!q?.id) return;
    this.answers.set(q.id, { selectedOptions: [opt] });
  }

  toggleOptionMSQ(opt: Option): void {
    const q = this.currentQuestion;
    if (!q?.id) return;
    let arr = this.answers.get(q.id)?.selectedOptions || [];
    const idx = arr.findIndex(o => o.id === opt.id);
    if (idx >= 0) arr = arr.filter((_, i) => i !== idx);
    else arr = [...arr, opt];
    this.answers.set(q.id, { selectedOptions: arr });
  }

  isSelectedMSQ(opt: Option): boolean {
    const q = this.currentQuestion;
    if (!q?.id) return false;
    return this.answers.get(q.id)?.selectedOptions?.some(o => o.id === opt.id) ?? false;
  }

  isSelectedMCQ(opt: Option): boolean {
    const q = this.currentQuestion;
    if (!q?.id) return false;
    return this.answers.get(q.id)?.selectedOptions?.[0]?.id === opt.id;
  }

  submitCurrent(): void {
    const q = this.currentQuestion;
    if (!q?.id || !this.attempt?.id || this.submitting) return;

    const body = this.answers.get(q.id);
    if (!body && (q.questionType === 'MCQ' || q.questionType === 'MSQ')) {
      this.snackBar.open('Please select an answer', 'Close', { duration: 2000 });
      return;
    }
    if (!body && (q.questionType === 'FILL_BLANK' || q.questionType === 'READING' || q.questionType === 'WRITING')) {
      this.snackBar.open('Please enter your answer', 'Close', { duration: 2000 });
      return;
    }

    const submitBody: { textAnswer?: string; selectedOptions?: { id: number }[] } = {};
    if (body?.textAnswer) submitBody.textAnswer = body.textAnswer;
    if (body?.selectedOptions?.length) submitBody.selectedOptions = body.selectedOptions!.map(o => ({ id: o.id! }));

    this.submitting = true;
    this.api.submitAnswer(this.attempt.id, q.id, submitBody).subscribe({
      next: () => {
        this.submitting = false;
        if (this.currentIndex < this.questions.length - 1) {
          this.currentIndex++;
        } else {
          this.finishAttempt();
        }
      },
      error: () => {
        this.submitting = false;
        this.snackBar.open('Failed to submit answer', 'Close', { duration: 3000 });
      }
    });
  }

  finishAttempt(): void {
    if (!this.attempt?.id || this.finishing) return;
    this.finishing = true;
    this.api.finishAttempt(this.attempt.id).subscribe({
      next: (a) => {
        this.attempt = a;
        this.router.navigate(['/frontoffice/evaluations', this.evaluationId, 'results'], {
          queryParams: { attemptId: a.id }
        });
      },
      error: () => {
        this.finishing = false;
        this.snackBar.open('Failed to submit evaluation', 'Close', { duration: 3000 });
      }
    });
  }

  prev(): void {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  getAnswerText(): string {
    const q = this.currentQuestion;
    if (!q?.id) return '';
    return this.answers.get(q.id)?.textAnswer ?? '';
  }

  setAnswerText(value: string): void {
    const q = this.currentQuestion;
    if (!q?.id) return;
    this.answers.set(q.id, { textAnswer: value });
  }
}
