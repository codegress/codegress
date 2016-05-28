import java.util.*;
public class random{
	static int[] array;
	static int size;
	public static void main(String[] args) {
		Scanner scan = new Scanner(System.in);
		size = Integer.parseInt(scan.nextLine());
		
		array = new int[size];
		Arrays.fill(array,-1);
		
		random prob = new random();
		String input[] = scan.nextLine().split(",");
		for(int i = 0;i < input.length;i++){
			prob.insert(Integer.parseInt(input[i]));
		}
		prob.displayHash();
		scan.close();
	}

	public void insert(int value){
		int key = getHashedIndex(value);
		if(array[key] == -1){
			array[key] = value;
		}
		else{
			int loopCount = 0;
			for(int i = key+1;i < size;i++){
				if(array[i] == -1){
					array[i] = value;
					break;
				}
				if(++loopCount == size) break;
				if(i == size-1) i = -1;
			}
		}
	}
	
	public void remove(int value){
		int key = getHashedIndex(value);
		if(array[key] == value){
			array[key] = -1;
		}
		else{
			int loopCount = 0;
			for(int i = key+1;i < size;i++){
				if(array[i] == value){
					array[i] = -1;
					break;
				}
				if(++loopCount == size) break;
				if(i == size-1) i = -1;
			}
		}
	}

	public int getHashedIndex(int value){
		return value%size;
	}

	public void displayHash(){
		for(int i = 0;i < size;i++){
          	if(i  != size-1)
				System.out.print(array[i]+",");
          	else 
              	System.out.print(array[i]);
		}
		System.out.println();
	}
}