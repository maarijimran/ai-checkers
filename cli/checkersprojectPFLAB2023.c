#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <limits.h>
#include <time.h>
#define rows 8
#define colm 8
#define AI_TIME_MS 1000
#define MAX_DEPTH 30
#define WIN_SCORE 100000
#define MAN_VALUE 100
#define KING_VALUE 250
#define ADVANCE_BONUS 5
#define HOME_ROW_BONUS 10
#define CENTRE_BONUS 5
#define MAX_MOVES 48
int maximum(int a, int b)
{
	return (a > b) ? a : b;
}
int minimum(int a, int b)
{
	return (a < b) ? a : b;
}
void printboard(char board[rows][colm])
{
	printf(" * * * * * * * * CHECKERS  BOARD * * * * * * * * * * *\n");
	printf(" *       0    1    2    3    4    5    6    7        *\n");
	printf(" *    ------------------------------------------     *\n");
	printf(" *  0 ||   || %c ||   || %c ||   || %c ||   || %c || 0   *\n", board[0][1], board[0][3], board[0][5], board[0][7]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *  1 || %c ||   || %c ||   || %c ||   || %c ||   || 1   *\n", board[1][0], board[1][2], board[1][4], board[1][6]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *  2 ||   || %c ||   || %c ||   || %c ||   || %c || 2   *\n", board[2][1], board[2][3], board[2][5], board[2][7]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *  3 || %c ||   || %c ||   || %c ||   || %c ||   || 3   *\n", board[3][0], board[3][2], board[3][4], board[3][6]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *  4 ||   || %c ||   || %c ||   || %c ||   || %c || 4   *\n", board[4][1], board[4][3], board[4][5], board[4][7]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *  5 || %c ||   || %c ||   || %c ||   || %c ||   || 5   *\n", board[5][0], board[5][2], board[5][4], board[5][6]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *  6 ||   || %c ||   || %c ||   || %c ||   || %c || 6   *\n", board[6][1], board[6][3], board[6][5], board[6][7]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *  7 || %c ||   || %c ||   || %c ||   || %c ||   || 7   *\n", board[7][0], board[7][2], board[7][4], board[7][6]);
	printf(" *    ------------------------------------------     *\n");
	printf(" *       0    1    2    3    4    5    6    7        *\n");
	printf(" * * * * * * * * * * * * * * * * * * * * * * * * * * *\n");
}
int checkforwin(char board[rows][colm])
{
	int white = 0;
	int black = 0;
	for (int i = 0; i < rows; i++)
	{
		for (int j = 0; j < colm; j++)
		{
			if (board[i][j] == 'w' || board[i][j] == 'W')
				white = 1;
			else if (board[i][j] == 'b' || board[i][j] == 'B')
				black = 1;
		}
	}
	if (!white)
		return 2;
	if (!black)
		return 1;
	return 0;
}
typedef struct
{
	int fr, fc, tr, tc;
	char piece;
	char captured;
} Move;
static const int dirs[4][2] = {{-1, 1}, {-1, -1}, {1, 1}, {1, -1}};
static int isside(char c, int black)
{
	return black ? (c == 'b' || c == 'B') : (c == 'w' || c == 'W');
}
static int inbounds(int r, int c)
{
	return r >= 0 && r < rows && c >= 0 && c < colm;
}
static int genmoves(char board[rows][colm], int black, Move moves[])
{
	int count = 0;
	int fwd = black ? -1 : 1;
	for (int i = rows - 1; i >= 0; i--)
	{
		for (int j = colm - 1; j >= 0; j--)
		{
			char piece = board[i][j];
			if (!isside(piece, black))
				continue;
			int king = (piece == 'B' || piece == 'W');
			for (int dist = 2; dist >= 1; dist--)
			{
				for (int d = 0; d < 4; d++)
				{
					if (!king && dirs[d][0] != fwd)
						continue;
					int tr = i + dirs[d][0] * dist;
					int tc = j + dirs[d][1] * dist;
					if (!inbounds(tr, tc) || board[tr][tc] != ' ')
						continue;
					char captured = 0;
					if (dist == 2)
					{
						captured = board[i + dirs[d][0]][j + dirs[d][1]];
						if (!isside(captured, !black))
							continue;
					}
					Move m = {i, j, tr, tc, piece, captured};
					moves[count++] = m;
				}
			}
		}
	}
	return count;
}
static void domove(char board[rows][colm], const Move *m)
{
	char placed = m->piece;
	if (placed == 'b' && m->tr == 0)
		placed = 'B';
	else if (placed == 'w' && m->tr == rows - 1)
		placed = 'W';
	board[m->fr][m->fc] = ' ';
	if (m->captured)
		board[(m->fr + m->tr) / 2][(m->fc + m->tc) / 2] = ' ';
	board[m->tr][m->tc] = placed;
}
static void undomove(char board[rows][colm], const Move *m)
{
	board[m->tr][m->tc] = ' ';
	if (m->captured)
		board[(m->fr + m->tr) / 2][(m->fc + m->tc) / 2] = m->captured;
	board[m->fr][m->fc] = m->piece;
}
static int evaluate(char board[rows][colm])
{
	int score = 0;
	for (int i = 0; i < rows; i++)
	{
		for (int j = 0; j < colm; j++)
		{
			char c = board[i][j];
			int value;
			if (c == 'b')
				value = MAN_VALUE + (rows - 1 - i) * ADVANCE_BONUS + (i == rows - 1 ? HOME_ROW_BONUS : 0);
			else if (c == 'w')
				value = MAN_VALUE + i * ADVANCE_BONUS + (i == 0 ? HOME_ROW_BONUS : 0);
			else if (c == 'B' || c == 'W')
				value = KING_VALUE;
			else
				continue;
			if (i >= 2 && i <= 5 && j >= 2 && j <= 5)
				value += CENTRE_BONUS;
			score += isside(c, 1) ? value : -value;
		}
	}
	return score;
}
static clock_t deadline;
static int timeup;
static long nodes;
static int outoftime(void)
{
	if ((++nodes & 1023) == 0 && clock() >= deadline)
		timeup = 1;
	return timeup;
}
static void ordermoves(Move moves[], int count)
{
	int front = 0;
	for (int n = 0; n < count; n++)
	{
		if (moves[n].captured)
		{
			Move m = moves[n];
			memmove(&moves[front + 1], &moves[front], (n - front) * sizeof(Move));
			moves[front++] = m;
		}
	}
}
static int quiesce(char board[rows][colm], int alpha, int beta, int black)
{
	int best = evaluate(board);
	if (black ? best >= beta : best <= alpha)
		return best;
	if (black)
		alpha = maximum(alpha, best);
	else
		beta = minimum(beta, best);
	Move moves[MAX_MOVES];
	int count = genmoves(board, black, moves);
	for (int n = 0; n < count; n++)
	{
		if (!moves[n].captured)
			continue;
		domove(board, &moves[n]);
		int value = quiesce(board, alpha, beta, !black);
		undomove(board, &moves[n]);
		if (black)
		{
			best = maximum(best, value);
			alpha = maximum(alpha, best);
		}
		else
		{
			best = minimum(best, value);
			beta = minimum(beta, best);
		}
		if (alpha >= beta)
			break;
	}
	return best;
}
static int minimax(char board[rows][colm], int depth, int alpha, int beta, int black, int ply)
{
	if (outoftime())
		return 0;
	if (depth <= 0)
		return quiesce(board, alpha, beta, black);
	Move moves[MAX_MOVES];
	int count = genmoves(board, black, moves);
	if (count == 0)
		return black ? -WIN_SCORE + ply : WIN_SCORE - ply;
	ordermoves(moves, count);
	int best = black ? INT_MIN : INT_MAX;
	for (int n = 0; n < count; n++)
	{
		domove(board, &moves[n]);
		int value = minimax(board, depth - 1, alpha, beta, !black, ply + 1);
		undomove(board, &moves[n]);
		if (timeup)
			return 0;
		if (black)
		{
			best = maximum(best, value);
			alpha = maximum(alpha, best);
		}
		else
		{
			best = minimum(best, value);
			beta = minimum(beta, best);
		}
		if (alpha >= beta)
			break;
	}
	return best;
}
int bestmoves(char board[rows][colm])
{
	Move moves[MAX_MOVES];
	int count = genmoves(board, 1, moves);
	if (count == 0)
		return -1;
	ordermoves(moves, count);
	deadline = clock() + (clock_t)((long long)AI_TIME_MS * CLOCKS_PER_SEC / 1000);
	timeup = 0;
	nodes = 0;
	for (int depth = 1; count > 1 && depth <= MAX_DEPTH; depth++)
	{
		int bestval = INT_MIN;
		int best = 0;
		for (int n = 0; n < count; n++)
		{
			domove(board, &moves[n]);
			int moveval = minimax(board, depth - 1, bestval, INT_MAX, 0, 1);
			undomove(board, &moves[n]);
			if (timeup)
				break;
			if (moveval > bestval)
			{
				bestval = moveval;
				best = n;
			}
		}
		if (timeup)
			break;
		Move m = moves[best];
		memmove(&moves[1], &moves[0], best * sizeof(Move));
		moves[0] = m;
		if (bestval >= WIN_SCORE - MAX_DEPTH * 2 || bestval <= -WIN_SCORE + MAX_DEPTH * 2)
			break;
	}
	printf("Moved From: (%d-%d) to (%d-%d)\n", moves[0].fr, moves[0].fc, moves[0].tr, moves[0].tc);
	domove(board, &moves[0]);
	return 0;
}
int playersturn(char board[rows][colm], const char *str, int black, int i, int j, int k, int l)
{
	printf("%s's move was from (%d-%d) to (%d-%d)\n", str, i, j, k, l);
	if (i < 0 || i >= rows || k < 0 || k >= rows)
	{
		printf("Row is out of bound\n");
		return -1;
	}
	if (j < 0 || j >= colm || l < 0 || l >= colm)
	{
		printf("Column is out of bound\n");
		return -1;
	}
	char piece = board[i][j];
	if (!isside(piece, black))
	{
		printf("Move your own piece\n");
		return -1;
	}
	if (board[k][l] != ' ')
	{
		printf("You must move correctly\n");
		return -1;
	}
	int king = (piece == 'B' || piece == 'W');
	int dr = k - i;
	int dc = l - j;
	if (!king && (black ? dr >= 0 : dr <= 0))
	{
		printf("%s must move %s\n", str, black ? "up" : "down");
		return -1;
	}
	char captured = 0;
	if ((dr == 2 || dr == -2) && (dc == 2 || dc == -2))
	{
		int jmpr = i + dr / 2;
		int jmpc = j + dc / 2;
		captured = board[jmpr][jmpc];
		if (!isside(captured, !black))
		{
			printf("Enemy is not at %d-%d\n", jmpr, jmpc);
			return -1;
		}
	}
	else if (!((dr == 1 || dr == -1) && (dc == 1 || dc == -1)))
	{
		printf("You can only move diagonally\n");
		return -1;
	}
	Move m = {i, j, k, l, piece, captured};
	printf("Moved From: (%d-%d) to (%d-%d)\n", i, j, k, l);
	domove(board, &m);
	return 0;
}
int hasmoves(char board[rows][colm], int black)
{
	Move moves[MAX_MOVES];
	return genmoves(board, black, moves) > 0;
}
void readline(char *buf, int size)
{
	if (!fgets(buf, size, stdin))
		exit(0);
	char *nl = strchr(buf, '\n');
	if (nl)
		*nl = '\0';
	else
	{
		int c;
		while ((c = getchar()) != '\n' && c != EOF)
			;
	}
}
int readint(void)
{
	char line[64];
	int value;
	readline(line, sizeof line);
	return sscanf(line, "%d", &value) == 1 ? value : -1;
}
int readpair(int *row, int *col)
{
	char line[64];
	readline(line, sizeof line);
	return sscanf(line, "%d%d", row, col) == 2 ? 0 : -1;
}
void humanturn(char board[rows][colm], const char *name, int black, const char *selectprompt)
{
	while (1)
	{
		int i, j, k, l;
		puts(name);
		printf("%s\n", selectprompt);
		while (readpair(&i, &j) != 0)
			printf("Enter a row and a column as two numbers\n");
		printf("MOVE TO:\n");
		printf("Enter Row and column to move piece\n");
		while (readpair(&k, &l) != 0)
			printf("Enter a row and a column as two numbers\n");
		if (playersturn(board, name, black, i, j, k, l) == 0)
			return;
		printf("Invalid Move\n");
	}
}
int main()
{
	// w (W is a king) moves down and is Player 1, b (B is a king) moves up and is Player 2 or the AI
	char str[20];
	char str2[20];
	int flag;
	char board[rows][colm] = {
		{'E', 'w', 'E', 'w', 'E', 'w', 'E', 'w'},
		{'w', 'E', 'w', 'E', 'w', 'E', 'w', 'E'},
		{'E', 'w', 'E', 'w', 'E', 'w', 'E', 'w'},
		{' ', 'E', ' ', 'E', ' ', 'E', ' ', 'E'},
		{'E', ' ', 'E', ' ', 'E', ' ', 'E', ' '},
		{'b', 'E', 'b', 'E', 'b', 'E', 'b', 'E'},
		{'E', 'b', 'E', 'b', 'E', 'b', 'E', 'b'},
		{'b', 'E', 'b', 'E', 'b', 'E', 'b', 'E'}};
	do
	{
		printf("ENTER 1 FOR TWO PLAYERS\nENTER 2 FOR ONE VS BOT\n");
		flag = readint();
	} while (flag != 1 && flag != 2);
	if (flag == 1)
	{
		printf("Enter Player 1 Name\n");
		readline(str, sizeof str);
		printf("Enter Player 2 Name\n");
		readline(str2, sizeof str2);
		printf("PIECE w (W REPRESENTS KING) represents %s\n", str);
		printf("While b (B REPRESENTS KING) represents %s\n", str2);
		while (1)
		{
			if (checkforwin(board) == 2 || !hasmoves(board, 0))
			{
				printf("%s WINS\n", str2);
				break;
			}
			printboard(board);
			humanturn(board, str, 0, "Enter Row and column to select piece");
			if (checkforwin(board) == 1 || !hasmoves(board, 1))
			{
				printf("%s WINS\n", str);
				break;
			}
			printboard(board);
			humanturn(board, str2, 1, "Enter Row and column to select piece");
		}
	}
	else
	{
		printf("ENTER PLAYER NAME\n");
		readline(str, sizeof str);
		while (1)
		{
			if (checkforwin(board) == 2 || !hasmoves(board, 0))
			{
				printf("AI WINS\n");
				printboard(board);
				break;
			}
			printboard(board);
			humanturn(board, str, 0, "Enter Row and column to select white piece");
			if (checkforwin(board) == 1)
			{
				printf("%s WINS\n", str);
				printboard(board);
				break;
			}
			printboard(board);
			if (bestmoves(board) != 0)
			{
				printf("AI has no moves\n%s WINS\n", str);
				printboard(board);
				break;
			}
			printf("Ai's MOVE\n");
		}
	}
	return 0;
}
