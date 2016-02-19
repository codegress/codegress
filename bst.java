import java.util.*;
import java.io.*;
public class random{
  public static void main(String args[]) throws Exception{
      BufferedReader br = new BufferedReader(
                          new InputStreamReader(System.in));
      String input = null;
      Node bst = new Node();
      while((input = br.readLine())!= null){
        try{
          int num = Integer.parseInt(input);
          bst.insert(new Node(num));  
        }
        catch(Exception e){
          e.printStackTrace();
        }
      }
      bst.inorderDisplay(bst.root);
    }
}
class Node{
  int data;
  Node left,right,root;
  public Node(){}
  public Node(int data){
    this.data = data;
  }
  public void insert(Node node){
    Node newNode = root;
    if(root == null){
      root = node;
    }
    else if(node.data <= newNode.data){
        while(newNode.left != null && node.data < newNode.data){
          newNode = newNode.left;
        }
        newNode.left = node;
    }
    else{
      while(newNode.right != null && node.data > newNode.data){
          newNode = newNode.right;
       }
      newNode.right = node;
    }
  }
  public void inorderDisplay(Node node){
    if(node != null){
      inorderDisplay(node.left);
      System.out.println(node.data);
      inorderDisplay(node.right);
    }
  }
}