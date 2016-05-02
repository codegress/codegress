import java.util.*;

// Do not change the public class name
public class random{
	public static void main(String args[]){
    	String str = new Scanner(System.in).nextLine();
      	String rev = new StringBuffer(str).reverse().toString();
      	System.out.println((str.equals(rev))?"1":"0");
    }
}