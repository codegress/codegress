import java.io.*;
public class random{
	public static void main(String[] args) throws Exception{
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		char input[] = br.readLine().toCharArray();
		int size = input.length;
		for(int i = 0, j = size-1; i < size/2 && i != j;){
			char firstChar = input[i];
			char lastChar = input[j];
			if(isAlphabet(firstChar) && isAlphabet(lastChar)){
				input = swap(input, i, j);
				i++;j--;
			}
			else if(isAlphabet(firstChar)){
				j--;
			}
			else if(isAlphabet(lastChar)){
				i++;
			}
			else{
				i++;j--;
			}
		}
		System.out.print(input);
	}

	private static boolean isAlphabet(char ch){
		if((int)ch >= 64 && (int)ch <= 91){
			return true;
		}
		else if((int)ch >= 96 && (int)ch <= 122){
			return true;
		}
		else return false;
	}

	private static char[] swap(char input[], int startIndex, int endIndex){
		if(startIndex >= 0 && endIndex < input.length){
			char firstChar = input[startIndex];
			char lastChar = input[endIndex];
			input[startIndex] = lastChar;
			input[endIndex] = firstChar;
		}
		return input;
	}
}